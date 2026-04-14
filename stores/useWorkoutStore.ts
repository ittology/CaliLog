import { create } from 'zustand';
import { loadData, saveDataPart } from '../utils/storage';
import { computeTargetsMet } from '../utils/progressionEngine';
import { WorkoutFactory, type ActiveExerciseState } from '../utils/workoutFactory';
import { usePlanStore } from './usePlanStore';
import { useProfileStore } from './useProfileStore';
import { debounce } from '../utils/helpers';
import type {
  WorkoutLog,
  ExerciseLog,
  SetLog,
  WorkoutPlan,
} from '../types';

// manages the in-progress workout session. every change triggers
// a debounced autosave to keep your data safe.

interface WorkoutStore {
  // active log being built — null if nothing is happening
  activeLog: WorkoutLog | null;
  exercises: ActiveExerciseState[];
  // how many seconds have passed
  elapsedSeconds: number;

  // start a brand new workout
  startWorkout: (plan: WorkoutPlan) => Promise<void>;
  // restore a session from storage (like after a crash)
  restoreWorkout: (log: WorkoutLog, plan: WorkoutPlan) => void;
  // toss the active workout without saving anything
  cancelWorkout: () => void;

  // set manipulation
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<SetLog>) => void;

  // progression selection
  selectProgression: (exerciseId: string, progressionId: string) => void;

  // quality check result
  setQualityCheckResult: (exerciseId: string, passed: boolean) => void;

  // timer
  tick: () => void;

  // inner helper for debounced autosaving
  _autosave: () => void;

  // check for existing active sessions in history on startup
  initStore: () => Promise<void>;
  // finish up, save to history, and clear the store
  finishWorkout: (notes?: string) => Promise<WorkoutLog | null>;
}

const debouncedAutosave = debounce(async (log: WorkoutLog) => {
  try {
    // delegate atomic update to the profile store to prevent race conditions
    await useProfileStore.getState().upsertLog(log);
  } catch (error) {
    console.warn('autosave failed', error);
  }
}, 800);

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeLog: null,
  exercises: [],
  elapsedSeconds: 0,

  startWorkout: async (plan: WorkoutPlan) => {
    const { activeLog: currentActive } = get();
    if (currentActive) {
      throw new Error('A workout is already in progress.');
    }

    const history = useProfileStore.getState().history;
    const existingActive = history.find(h => h.status === 'active');
    if (existingActive) {
       throw new Error('A workout is already in progress in your history.');
    }
    
    const profile = useProfileStore.getState().profile;
    const exercises = WorkoutFactory.createActiveExercises(plan, history, profile);
    const activeLog = WorkoutFactory.createWorkoutLogSkeleton(plan);

    set({
      activeLog,
      exercises,
      elapsedSeconds: 0,
    });

    // persist the skeleton immediately for crash recovery
    const updatedHistory = [activeLog, ...history];
    useProfileStore.setState({ history: updatedHistory });
    await saveDataPart('history', updatedHistory);
  },

  restoreWorkout: (log: WorkoutLog, plan: WorkoutPlan) => {
    const exercises = WorkoutFactory.restoreActiveExercises(log, plan);

    set({
      activeLog: log,
      exercises,
      elapsedSeconds: log.duration,
    });
  },

  initStore: async () => {
    try {
      const history = useProfileStore.getState().history;
      const active = history.find(h => h.status === 'active');
      if (active) {
        const plans = usePlanStore.getState().plans;
        const plan = plans.find(p => p.id === active.planId);
        if (plan) {
          get().restoreWorkout(active, plan);
        }
      }
    } catch (e) {
      console.error('Failed to init workout store', e);
    }
  },

  cancelWorkout: async () => {
    const { activeLog } = get();
    if (activeLog) {
      const history = useProfileStore.getState().history;
      const updatedHistory = history.filter((h) => h.id !== activeLog.id);
      useProfileStore.setState({ history: updatedHistory });
      await saveDataPart('history', updatedHistory);
    }
    set({ activeLog: null, exercises: [], elapsedSeconds: 0 });
  },

  addSet: (exerciseId) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, sets: [...ex.sets, WorkoutFactory.makeEmptySet()] }
          : ex
      ),
    }));
    get()._autosave();
  },

  removeSet: (exerciseId, setId) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      ),
    }));
    get()._autosave();
  },

  updateSet: (exerciseId, setId, patch) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s
              ),
            }
          : ex
      ),
    }));
    get()._autosave();
  },

  selectProgression: (exerciseId, progressionId) => {
    const plans = usePlanStore.getState().plans;
    const plan = plans.find((p) => p.id === get().activeLog?.planId);
    if (!plan) return;

    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              selectedProgressionId: progressionId,
              unit: plan.exercises
                .find((e) => e.id === exerciseId)
                ?.progressions.find((p) => p.id === progressionId)?.unit ??
                ex.unit,
            }
          : ex
      ),
    }));
    get()._autosave();
  },

  setQualityCheckResult: (exerciseId, passed) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, qualityCheckResult: passed }
          : ex
      ),
    }));
  },

  tick: () => {
    const { activeLog } = get();
    if (!activeLog) return;

    set((state) => {
      const nextElapsed = state.elapsedSeconds + 1;
      
      // autosave every 10 seconds to persist timer state
      if (nextElapsed % 10 === 0) {
        setTimeout(() => get()._autosave(), 0);
      }
      
      return { elapsedSeconds: nextElapsed };
    });
  },

  finishWorkout: async (notes?: string) => {
    const { activeLog, exercises, elapsedSeconds } = get();
    if (!activeLog) return null;

    const plans = usePlanStore.getState().plans;
    const plan = plans.find((p) => p.id === activeLog.planId);
    if (!plan) return null;

    const profile = useProfileStore.getState().profile;

    // build the final exercise log array
    const exerciseLogs: ExerciseLog[] = exercises.map((exState) => {
      const planEx = plan.exercises.find((e) => e.id === exState.exerciseId);
      const progression = planEx?.progressions.find(
        (p) => p.id === exState.selectedProgressionId
      );

      const targetsMet = progression
        ? computeTargetsMet(
            exState.sets,
            progression.targetSets,
            progression.targetValue,
            progression.unit,
            progression.isMax
          )
        : false;

      // update streak: increment if target met, otherwise reset
      const prevStreak = exState.suggestion.streakCount;
      const streakCount = targetsMet
        ? Math.min(prevStreak + 1, profile.streakTarget)
        : 0;

      return {
        exerciseId: exState.exerciseId,
        progressionId: exState.selectedProgressionId,
        progressionName: progression?.name ?? 'Unknown',
        unit: exState.unit,
        sets: exState.sets,
        targetsMet,
        qualityCheckPassed: exState.qualityCheckResult,
        streakCount,
      };
    });

    const completedLog: WorkoutLog = {
      ...activeLog,
      duration: elapsedSeconds,
      notes,
      exercises: exerciseLogs,
      status: 'completed',
    };

    // securely update through the profile store without blocking
    await useProfileStore.getState().upsertLog(completedLog);
    set({ activeLog: null, exercises: [], elapsedSeconds: 0 });
    return completedLog;
  },

  _autosave: () => {
    const { activeLog, exercises, elapsedSeconds } = get();
    if (!activeLog) return;

    // create a snapshot for the autosave process
    const snapshot: WorkoutLog = {
      ...activeLog,
      duration: elapsedSeconds,
      exercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        progressionId: ex.selectedProgressionId,
        progressionName: '',
        unit: ex.unit,
        sets: ex.sets,
        targetsMet: false,
        streakCount: ex.suggestion.streakCount,
      })),
    };
    debouncedAutosave(snapshot);
  },
}));
