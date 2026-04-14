// manages user profile, body weight log, and workout history
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { loadData, saveData, saveDataPart } from '../utils/storage';
import type { UserProfile, WorkoutLog, BodyWeightEntry, ChatMessage, AppData } from '../types';

interface ProfileStore {
  profile: UserProfile;
  history: WorkoutLog[];
  chatHistory: ChatMessage[];
  isLoaded: boolean;
  schemaError: boolean;
  corruptedData: string | null;

  load: () => Promise<void>;
  importData: (data: AppData) => Promise<void>;

  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;

  addBodyWeight: (weight: number, unit: 'kg' | 'lb') => Promise<void>;
  removeBodyWeight: (id: string) => Promise<void>;

  deleteLog: (logId: string) => Promise<void>;
  // update or create a log entry (used when finishing workouts)
  upsertLog: (log: WorkoutLog) => Promise<void>;

  // chat management
  setChatHistory: (history: ChatMessage[]) => Promise<void>;
  addChatMessage: (msg: ChatMessage) => Promise<void>;
  clearChat: () => Promise<void>;

  // update backup date and file id without triggering a new sync loop
  updateBackupStatus: (date: string, fileId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: { 
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
      personalContext: '',
    },
    backupSettings: {
      googleDriveConnected: false,
      autoBackupEnabled: false,
    },
  },
  history: [],
  chatHistory: [],
  isLoaded: false,
  schemaError: false,
  corruptedData: null,

  load: async () => {
    try {
      const data = await loadData();
      set({ 
        profile: data.profile, 
        history: data.history, 
        chatHistory: data.chatHistory || [],
        isLoaded: true,
        schemaError: false,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'SCHEMA_MISMATCH') {
        // show the data-recovery screen
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const json = await AsyncStorage.getItem('@calilog_profile').catch(() => null);
        set({ 
          schemaError: true, 
          isLoaded: true, 
          corruptedData: json || null 
        });
      } else {
        // any other unexpected error (corrupted JSON, storage failure, etc.)
        // fall back to defaults so the app doesn't freeze on the splash screen
        console.error('ProfileStore: unexpected load error, falling back to defaults', error);
        set({ isLoaded: true, schemaError: false });
      }
    }
  },

  importData: async (data: AppData) => {
    await saveData(data);
    set({ 
      profile: data.profile, 
      history: data.history, 
      chatHistory: data.chatHistory || [],
      schemaError: false,
      isLoaded: true 
    });
  },

  updateProfile: async (patch) => {
    const profile = { ...get().profile, ...patch };
    set({ profile });
    await saveDataPart('profile', profile);
  },

  addBodyWeight: async (weight, unit) => {
    const entry: BodyWeightEntry = {
      id: uuidv4(),
      date: new Date().toISOString(),
      weight,
      unit,
    };
    const profile = {
      ...get().profile,
      bodyWeightLog: [entry, ...get().profile.bodyWeightLog],
    };
    set({ profile });
    await saveDataPart('profile', profile);
  },

  removeBodyWeight: async (id) => {
    const profile = {
      ...get().profile,
      bodyWeightLog: get().profile.bodyWeightLog.filter((e) => e.id !== id),
    };
    set({ profile });
    await saveDataPart('profile', profile);
  },

  deleteLog: async (logId) => {
    const history = get().history.filter((h) => h.id !== logId);
    set({ history });
    await saveDataPart('history', history);
  },

  upsertLog: async (log) => {
    // using atomic functional update to prevent data loss in race conditions
    set((state) => {
      const idx = state.history.findIndex((h) => h.id === log.id);
      let updated: WorkoutLog[];
      if (idx >= 0) {
        updated = [...state.history];
        updated[idx] = log;
      } else {
        updated = [log, ...state.history];
      }
      // trigger save without blocking state
      saveDataPart('history', updated).catch(console.error);
      return { history: updated };
    });
  },

  setChatHistory: async (chatHistory) => {
    set({ chatHistory });
    await saveDataPart('chat', chatHistory);
  },

  addChatMessage: async (msg) => {
    const chatHistory = [...get().chatHistory, msg];
    set({ chatHistory });
    await saveDataPart('chat', chatHistory);
  },

  clearChat: async () => {
    set({ chatHistory: [] });
    await saveDataPart('chat', []);
  },

  updateBackupStatus: async (date, fileId) => {
    const backupSettings = { ...get().profile.backupSettings, lastBackupDate: date, driveFileId: fileId };
    const profile = { ...get().profile, backupSettings };
    set({ profile });
    await saveDataPart('profile', profile);
  },
}));
