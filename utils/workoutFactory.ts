import { v4 as uuidv4 } from 'uuid';
import type { 
  WorkoutPlan, 
  WorkoutLog, 
  UserProfile, 
  SetLog, 
  PlanExercise,
  ProgressionSuggestion
} from '../types';
import { analyzeProgression } from './progressionEngine';

// exercise state during an active training session
export interface ActiveExerciseState {
  exerciseId: string;
  selectedProgressionId: string;
  suggestion: ProgressionSuggestion;
  sets: SetLog[];
  unit: 'reps' | 'seconds' | 'reps/side' | 'reps/leg' | 'reps/arm';
  qualityCheckResult?: boolean;
}

// workout state lifecycle management.
// encapsulates logic to keep stores focused on state only.
export const WorkoutFactory = {
  // initialize active exercise states for a new session
  createActiveExercises: (
    plan: WorkoutPlan,
    history: WorkoutLog[],
    profile: UserProfile
  ): ActiveExerciseState[] => {
    return plan.exercises.map((ex: PlanExercise) => {
      const suggestion = analyzeProgression(
        history,
        plan.id,
        ex,
        profile.streakTarget
      );

      // initialize sets based on suggested progression
      const targetProg = ex.progressions.find((p) => p.id === suggestion.suggestedProgressionId)
        ?? ex.progressions[0];
      
      const sets: SetLog[] = Array.from({ length: targetProg.targetSets }, () =>
        WorkoutFactory.makeEmptySet()
      );

      return {
        exerciseId: ex.id,
        selectedProgressionId: suggestion.suggestedProgressionId,
        suggestion,
        sets,
        unit: targetProg.unit,
      };
    });
  },

  // rebuild exercise states from a persisted log
  restoreActiveExercises: (
    log: WorkoutLog, 
    plan: WorkoutPlan
  ): ActiveExerciseState[] => {
    // 1. process existing exercises from the log
    const exercises: ActiveExerciseState[] = log.exercises.map((exLog) => {
      return {
        exerciseId: exLog.exerciseId,
        selectedProgressionId: exLog.progressionId,
        suggestion: {
          suggestedProgressionId: exLog.progressionId,
          streakCount: exLog.streakCount,
          qualityCheckDue: false, // will be re-evaluated on finish
          lastSets: exLog.sets,
        },
        sets: exLog.sets.length > 0 ? exLog.sets : [WorkoutFactory.makeEmptySet()],
        unit: exLog.unit ?? 'reps',
        qualityCheckResult: exLog.qualityCheckPassed,
      };
    });

    // 2. ensure all plan exercises are present, even if not started
    const loggedIds = new Set(log.exercises.map((e) => e.exerciseId));
    plan.exercises.forEach((ex) => {
      if (!loggedIds.has(ex.id)) {
        const prog = ex.progressions[0];
        exercises.push({
          exerciseId: ex.id,
          selectedProgressionId: prog.id,
          suggestion: { 
            suggestedProgressionId: prog.id, 
            streakCount: 0, 
            qualityCheckDue: false, 
            lastSets: [] 
          },
          sets: [WorkoutFactory.makeEmptySet()],
          unit: prog.unit,
        });
      }
    });

    return exercises;
  },

  // generates a new workout log structure
  createWorkoutLogSkeleton: (plan: WorkoutPlan): WorkoutLog => {
    return {
      id: uuidv4(),
      planId: plan.id,
      planName: plan.name,
      date: new Date().toISOString(),
      duration: 0,
      exercises: [],
      status: 'active',
    };
  },

  makeEmptySet: (): SetLog => {
    return { id: uuidv4(), completed: false };
  },
};
