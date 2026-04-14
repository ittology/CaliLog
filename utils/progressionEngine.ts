// analyze progression using the 3-session streak rule.
// streaks of successful sessions trigger a level up check.
import type {
  WorkoutLog,
  ExerciseLog,
  PlanExercise,
  ProgressionSuggestion,
  SetLog,
} from '../types';

export function analyzeProgression(
  history: WorkoutLog[],
  planId: string,
  exercise: PlanExercise,
  streakTarget: number
): ProgressionSuggestion {
  const progressionIds = exercise.progressions.map((p) => p.id);
  const firstProgressionId = progressionIds[0];

  // use only completed logs for this specific plan
  const relevantLogs = history
    .filter((log) => log.planId === planId && log.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (relevantLogs.length === 0) {
    return {
      suggestedProgressionId: firstProgressionId,
      streakCount: 0,
      qualityCheckDue: false,
      lastSets: [],
    };
  }

  // check state from the most recent session
  const mostRecentExLog = findExerciseLog(relevantLogs[0], exercise.id);

  if (!mostRecentExLog) {
    return {
      suggestedProgressionId: firstProgressionId,
      streakCount: 0,
      qualityCheckDue: false,
      lastSets: [],
    };
  }

  let currentProgressionId = mostRecentExLog.progressionId;
  const lastSets = mostRecentExLog.sets;

  // move to next progression if quality check was previously passed
  if (mostRecentExLog.qualityCheckPassed === true) {
    const currentIdx = progressionIds.indexOf(currentProgressionId);
    if (currentIdx >= 0 && currentIdx < progressionIds.length - 1) {
      return {
        suggestedProgressionId: progressionIds[currentIdx + 1],
        streakCount: 0,
        qualityCheckDue: false,
        lastSets: [],
      };
    }
    // can't go higher than the last progression
    return {
      suggestedProgressionId: currentProgressionId,
      streakCount: streakTarget,
      qualityCheckDue: false,
      lastSets,
    };
  }

  // calculate consecutive successes at the current level
  let streak = 0;
  for (const log of relevantLogs) {
    const exLog = findExerciseLog(log, exercise.id);
    if (!exLog) break; // session exists but exercise wasn't done → streak broken
    if (exLog.progressionId !== currentProgressionId) break; // switched progression → streak broken
    if (!exLog.targetsMet) break; // missed targets → streak broken
    streak++;
    if (streak >= streakTarget) break; // streak target reached
  }

  return {
    suggestedProgressionId: currentProgressionId,
    streakCount: Math.min(streak, streakTarget),
    qualityCheckDue: streak >= streakTarget,
    lastSets,
  };
}

function findExerciseLog(
  log: WorkoutLog,
  exerciseId: string
): ExerciseLog | undefined {
  return log.exercises.find((ex) => ex.exerciseId === exerciseId);
}

// determine if sets meet the required targets

export function computeTargetsMet(
  sets: SetLog[],
  targetSets: number,
  targetValue: number,
  unit: string,
  isMax?: boolean
): boolean {
  const isTimeBased = unit === 'seconds' || unit === 'min';
  const completedSets = sets.filter((s) => s.completed);
  if (completedSets.length < targetSets) return false;

  // validate only the required number of sets
  const setsToCheck = completedSets.slice(0, targetSets);
  return setsToCheck.every((s) => {
    // for max effort, any non-zero value counts as success
    if (isMax) {
      const val = !isTimeBased ? (s.amount ?? 0) : (s.duration ?? 0);
      return val >= 1;
    }
    
    const value = !isTimeBased ? (s.amount ?? 0) : (s.duration ?? 0);
    return value >= targetValue;
  });
}