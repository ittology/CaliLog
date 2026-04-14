import 'react-native-reanimated';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GoogleDriveService } from '../services/googleDrive';
import { usePlanStore } from '../stores/usePlanStore';
import { useWorkoutStore } from '../stores/useWorkoutStore';
import { useProfileStore } from '../stores/useProfileStore';
import { Colors } from '../constants/theme';
import { SchemaErrorScreen } from '../components/ui/SchemaErrorScreen';
import { BackupOrchestrator } from '../services/backupOrchestrator';

// keep the splash screen visible while we fetch our data
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

export default function RootLayout() {
  const loadPlans = usePlanStore((s) => s.load);
  const loadProfile = useProfileStore((s) => s.load);
  const initWorkout = useWorkoutStore((s) => s.initStore);
  const planStoreLoaded = usePlanStore((s) => s.isLoaded);
  const profileStoreLoaded = useProfileStore((s) => s.isLoaded);
  const profile = useProfileStore((s) => s.profile);
  const schemaError = useProfileStore((s) => s.schemaError);

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadPlans(), loadProfile()]);
        // once plans and history are loaded, we can look for active sessions
        await initWorkout();
        // hook up the background backup systems after initial load
        BackupOrchestrator.initialize();
      } catch (e) {
        console.error('failed to initialize app stores', e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (profileStoreLoaded && planStoreLoaded) {
      // once stores are ready, configure native services
      if (profile.backupSettings?.webClientId) {
        GoogleDriveService.configure(profile.backupSettings.webClientId);
      }
      
      // hide the splash screen
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
      });
    }
  }, [profileStoreLoaded, planStoreLoaded, profile.backupSettings?.webClientId]);

  // we wrap everything in the same gesturehandlerrootview to ensure
  // that the native side never loses the gesture dispatcher during transitions.
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StatusBar style="light" />
        
        {!profileStoreLoaded || !planStoreLoaded ? (
          // show nothing/placeholder while splash is visible
          <View style={{ flex: 1 }} />
        ) : schemaError ? (
          <SchemaErrorScreen />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout/[planId]" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="workout/summary" />
            <Stack.Screen name="plan/[planId]" />
            <Stack.Screen name="history/[logId]" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
