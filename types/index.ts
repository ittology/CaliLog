// central type definitions for the app
// all interfaces are strictly typed

// workout plans and progressions

export interface Progression {
  id: string;
  name: string;
  // sets needed to hit the target
  targetSets: number;
  // reps or seconds, based on unit
  targetValue: number;
  unit: 'reps' | 'seconds' | 'reps/side' | 'reps/leg' | 'reps/arm';
  notes: string;
  // optional guide video url
  videoUrl?: string;
  // if true, any value >= 1 meets the target (for max sets)
  isMax?: boolean;
}

export interface PlanExercise {
  id: string;
  // ordered easier to harder
  progressions: Progression[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  createdAt: string;
  updatedAt: string;
}

// body weight tracking

export interface BodyWeightEntry {
  id: string;
  date: string; // iso string
  weight: number; // in users preferred unit (kg or lbs)
  unit: 'kg' | 'lb';
}

export interface AiProvider {
  id: string;
  name: string; // e.g. "Google" or "Groq"
  apiKey: string;
  models: string[]; // models this key has access to
}

// user profile and app settings

export interface UserProfile {
  // sessions needed before a quality check prompt
  streakTarget: number;
  bodyWeightLog: BodyWeightEntry[];
  
  // ai and backup configs
  aiSettings: {
    providers: AiProvider[];
    primaryModel: string; // currently selected model id
    logContextLimit: number; // default 10
    planContextLimit: number; // default 5
    weightLogLimit: number; // default 100
    personalContext?: string; // bio, goals, limits
  };
  backupSettings: {
    googleDriveConnected: boolean;
    autoBackupEnabled: boolean;
    lastBackupDate?: string;
    webClientId?: string; // needed for google sign-in
    driveFileId?: string; // file id in google drive
  };
}

// chat history

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCallId?: string; // for tool result mapping
  modelDisplayName?: string;
}

// workout logging and history

export interface SetLog {
  id: string;
  // reps or amount for the set
  amount?: number;
  // added weight in kg or lb
  weight?: number;
  // Hold duration in seconds (undefined for pure rep exercises)
  duration?: number;
  // if the set was finished
  completed: boolean;
  // seconds rested after this set
  restTime?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  progressionId: string;
  progressionName: string;
  unit?: 'reps' | 'seconds' | 'reps/side' | 'reps/leg' | 'reps/arm';
  sets: SetLog[];
  // true if the user met the target goals
  targetsMet: boolean;
  // Only set when a quality check was triggered
  qualityCheckPassed?: boolean;
  // 0-N consecutive sessions where targetsMet = true up to streakTarget
  streakCount: number;
}

export interface WorkoutLog {
  id: string;
  planId: string;
  // Denormalized for display in history without plan lookup
  planName: string;
  date: string; // iso datetime
  // seconds from start to finish
  duration: number;
  exercises: ExerciseLog[];
  notes?: string;
  // 'active' while in-progress, 'completed' after save
  status: 'active' | 'completed';
}

// local persistence schema

export interface AppData {
  schemaVersion: number;
  profile: UserProfile;
  plans: WorkoutPlan[];
  history: WorkoutLog[];
  chatHistory: ChatMessage[];
}

// progression suggestions from the engine

export interface ProgressionSuggestion {
  suggestedProgressionId: string;
  streakCount: number;
  // true if streakTarget is hit and we need a quality check
  qualityCheckDue: boolean;
  // last sessions sets for ghost values
  lastSets: SetLog[];
}
