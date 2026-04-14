// local storage wrapper using asyncstorage with granular partitioning and migration support
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData, UserProfile, WorkoutPlan, WorkoutLog, ChatMessage } from '../types';
import { createDefaultPlans } from '../constants/templates';

const LEGACY_STORAGE_KEY = '@calilog_data';
const CURRENT_SCHEMA_VERSION = 1;

const KEYS = {
  PROFILE: '@calilog_profile',
  PLANS: '@calilog_plans',
  HISTORY: '@calilog_history',
  CHAT: '@calilog_chat',
} as const;

const DEFAULT_PROFILE: UserProfile = {
  streakTarget: 3,
  bodyWeightLog: [],
  aiSettings: {
    providers: [
      { id: 'google', name: 'Google', apiKey: '', models: [] },
      { id: 'groq', name: 'Groq', apiKey: '', models: [] },
    ],
    primaryModel: '',
    logContextLimit: 10,
    planContextLimit: 5,
    weightLogLimit: 100,
  },
  backupSettings: {
    googleDriveConnected: false,
    autoBackupEnabled: false,
  },
};

function getDefaultData(): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: DEFAULT_PROFILE,
    plans: createDefaultPlans(),
    history: [],
    chatHistory: [],
  };
}

// write queue to prevent concurrent filesystem I/O issues
let _writeQueue: Promise<void> = Promise.resolve();
let _onSaveError: ((error: Error) => void) | null = null;

export function onStorageError(callback: (error: Error) => void) {
  _onSaveError = callback;
}

// atomic write coordinator. ensures only one store can write to any key at a time.
async function atomicWrite<T>(key: string, value: T): Promise<void> {
  const nextTask = _writeQueue.then(async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error: any) {
      console.error(`Storage Error for key ${key}:`, error);
      if (_onSaveError) _onSaveError(error);
      throw error;
    }
  });
  
  // catch unhandled rejections so subsequent queue writes aren't deadlocked
  _writeQueue = nextTask.catch(() => {});
  return nextTask;
}

// loads and migrate data from the old monolithic blob to granular keys if needed.
export async function loadData(): Promise<AppData> {
  try {
    const legacyJson = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    
    // migration logic: if legacy data exists, split it and clear it
    if (legacyJson) {
      console.warn('storage: legacy data found, migrating to granular keys');
      const parsed = JSON.parse(legacyJson) as AppData;
      
      await atomicWrite(KEYS.PROFILE, { ...parsed.profile, schemaVersion: parsed.schemaVersion });
      await atomicWrite(KEYS.PLANS, parsed.plans);
      await atomicWrite(KEYS.HISTORY, parsed.history);
      await atomicWrite(KEYS.CHAT, parsed.chatHistory);
      
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      return parsed;
    }

    // load from granular keys
    const [profileJson, plansJson, historyJson, chatJson] = await Promise.all([
      AsyncStorage.getItem(KEYS.PROFILE),
      AsyncStorage.getItem(KEYS.PLANS),
      AsyncStorage.getItem(KEYS.HISTORY),
      AsyncStorage.getItem(KEYS.CHAT),
    ]);

    if (!profileJson) {
      const fresh = getDefaultData();
      await saveData(fresh);
      return fresh;
    }

    const profile = JSON.parse(profileJson);
    
    // treat missing schemaVersion as v1 (first-install or schema-less write from store)
    const storedVersion = profile.schemaVersion ?? CURRENT_SCHEMA_VERSION;

    // only throw if there is an explicit, incompatible version written to disk
    if (typeof profile.schemaVersion === 'number' && profile.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      throw new Error('schema_mismatch');
    }

    // backfill so subsequent reads don't hit this branch again
    if (!profile.schemaVersion) {
      await atomicWrite(KEYS.PROFILE, { ...profile, schemaVersion: CURRENT_SCHEMA_VERSION });
    }

    return {
      schemaVersion: storedVersion,
      profile: profile as UserProfile,
      plans: plansJson ? JSON.parse(plansJson) : [],
      history: historyJson ? JSON.parse(historyJson) : [],
      chatHistory: chatJson ? JSON.parse(chatJson) : [],
    };
  } catch (error: any) {
    if (error.message === 'schema_mismatch') throw error;
    console.warn('storage: failed to load data, falling back to defaults', error);
    return getDefaultData();
  }
}

// saves the entire appdata. 
// note: stores should prefer saveDataPart for better performance.
export async function saveData(data: AppData): Promise<void> {
  await Promise.all([
    atomicWrite(KEYS.PROFILE, { ...data.profile, schemaVersion: data.schemaVersion }),
    atomicWrite(KEYS.PLANS, data.plans),
    atomicWrite(KEYS.HISTORY, data.history),
    atomicWrite(KEYS.CHAT, data.chatHistory),
  ]);
}

// save specific parts of the state to avoid redundant I/O
export async function saveDataPart(
  part: 'profile' | 'plans' | 'history' | 'chat',
  data: UserProfile | WorkoutPlan[] | WorkoutLog[] | ChatMessage[],
  schemaVersion: number = CURRENT_SCHEMA_VERSION
): Promise<void> {
  let key: string;
  let payload: any = data;

  switch (part) {
    case 'profile': 
      key = KEYS.PROFILE; 
      payload = { ...data, schemaVersion };
      break;
    case 'plans': key = KEYS.PLANS; break;
    case 'history': key = KEYS.HISTORY; break;
    case 'chat': key = KEYS.CHAT; break;
    default: throw new Error(`Unknown storage part: ${part}`);
  }

  return atomicWrite(key, payload);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
