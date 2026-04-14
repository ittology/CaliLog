// manages workout plans with asyncstorage persistence
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { loadData, saveDataPart } from '../utils/storage';
import type { WorkoutPlan, PlanExercise, Progression } from '../types';

interface PlanStore {
  plans: WorkoutPlan[];
  isLoaded: boolean;

  // initialise from storage once at app start
  load: () => Promise<void>;

  createPlan: (name: string) => Promise<WorkoutPlan>;
  updatePlan: (plan: WorkoutPlan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<void>;

  // managing exercises in a plan
  addExercise: (planId: string) => Promise<void>;
  removeExercise: (planId: string, exerciseId: string) => Promise<void>;
  moveExercise: (planId: string, fromIdx: number, toIdx: number) => Promise<void>;

  // managing progressions in an exercise
  addProgression: (planId: string, exerciseId: string, progression: Omit<Progression, 'id'>) => Promise<void>;
  updateProgression: (planId: string, exerciseId: string, progression: Progression) => Promise<void>;
  removeProgression: (planId: string, exerciseId: string, progressionId: string) => Promise<void>;
  reorderProgressions: (planId: string, exerciseId: string, progressions: Progression[]) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plans: [],
  isLoaded: false,

  load: async () => {
    const data = await loadData();
    set({ plans: data.plans, isLoaded: true });
  },

  createPlan: async (name) => {
    const now = new Date().toISOString();
    const newPlan: WorkoutPlan = {
      id: uuidv4(),
      name,
      exercises: [],
      createdAt: now,
      updatedAt: now,
    };
    const plans = [...get().plans, newPlan];
    set({ plans });
    await persistPlans(plans);
    return newPlan;
  },

  updatePlan: async (plan) => {
    const updated = { ...plan, updatedAt: new Date().toISOString() };
    const plans = get().plans.map((p) => (p.id === plan.id ? updated : p));
    set({ plans });
    await persistPlans(plans);
  },

  deletePlan: async (planId) => {
    const plans = get().plans.filter((p) => p.id !== planId);
    set({ plans });
    await persistPlans(plans);
  },

  duplicatePlan: async (planId) => {
    const original = get().plans.find((p) => p.id === planId);
    if (!original) return;
    const now = new Date().toISOString();
    const copy: WorkoutPlan = {
      ...original,
      id: uuidv4(),
      name: `${original.name} (copy)`,
      exercises: original.exercises.map((ex) => ({
        ...ex,
        id: uuidv4(),
        progressions: ex.progressions.map((pr) => ({ ...pr, id: uuidv4() })),
      })),
      createdAt: now,
      updatedAt: now,
    };
    const plans = [...get().plans, copy];
    set({ plans });
    await persistPlans(plans);
  },

  addExercise: async (planId) => {
    const newEx: PlanExercise = {
      id: uuidv4(),
      progressions: [
        {
          id: uuidv4(),
          name: 'New Exercise',
          targetSets: 3,
          targetValue: 8,
          unit: 'reps',
          notes: '',
        },
      ],
    };
    const plans = get().plans.map((p) =>
      p.id === planId
        ? { ...p, exercises: [...p.exercises, newEx], updatedAt: new Date().toISOString() }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },

  removeExercise: async (planId, exerciseId) => {
    const plans = get().plans.map((p) =>
      p.id === planId
        ? { ...p, exercises: p.exercises.filter((e) => e.id !== exerciseId), updatedAt: new Date().toISOString() }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },

  moveExercise: async (planId, fromIdx, toIdx) => {
    const plans = get().plans.map((p) => {
      if (p.id !== planId) return p;
      const exercises = [...p.exercises];
      const [moved] = exercises.splice(fromIdx, 1);
      exercises.splice(toIdx, 0, moved);
      return { ...p, exercises, updatedAt: new Date().toISOString() };
    });
    set({ plans });
    await persistPlans(plans);
  },

  addProgression: async (planId, exerciseId, progression) => {
    const newProg: Progression = { ...progression, id: uuidv4() };
    const plans = get().plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            exercises: p.exercises.map((ex) =>
              ex.id === exerciseId
                ? { ...ex, progressions: [...ex.progressions, newProg] }
                : ex
            ),
          }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },

  updateProgression: async (planId, exerciseId, progression) => {
    const plans = get().plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            exercises: p.exercises.map((ex) =>
              ex.id === exerciseId
                ? {
                    ...ex,
                    progressions: ex.progressions.map((pr) =>
                      pr.id === progression.id ? progression : pr
                    ),
                  }
                : ex
            ),
          }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },

  removeProgression: async (planId, exerciseId, progressionId) => {
    const plans = get().plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            exercises: p.exercises.map((ex) =>
              ex.id === exerciseId
                ? { ...ex, progressions: ex.progressions.filter((pr) => pr.id !== progressionId) }
                : ex
            ),
          }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },

  reorderProgressions: async (planId, exerciseId, progressions) => {
    const plans = get().plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            exercises: p.exercises.map((ex) =>
              ex.id === exerciseId ? { ...ex, progressions } : ex
            ),
          }
        : p
    );
    set({ plans });
    await persistPlans(plans);
  },
}));

async function persistPlans(plans: WorkoutPlan[]): Promise<void> {
  await saveDataPart('plans', plans);
}
