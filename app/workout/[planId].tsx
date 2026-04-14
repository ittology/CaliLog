import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { usePlanStore } from '../../stores/usePlanStore';
import { useWorkoutStore } from '../../stores/useWorkoutStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { QualityCheckModal } from '../../components/workout/QualityCheckModal';
import { formatTime } from '../../utils/helpers';

export default function WorkoutScreen() {
  useKeepAwake(); // prevent screen sleep during workout

  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const plan = usePlanStore((s) => s.plans.find((p) => p.id === planId));
  const profile = useProfileStore((s) => s.profile);
  const upsertLog = useProfileStore((s) => s.upsertLog);

  const activeLog = useWorkoutStore((s) => s.activeLog);
  const exercises = useWorkoutStore((s) => s.exercises);
  const elapsedSeconds = useWorkoutStore((s) => s.elapsedSeconds);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const tick = useWorkoutStore((s) => s.tick);

  const [showQC, setShowQC] = useState(false);
  const [qcExercises, setQcExercises] = useState<
    { exerciseId: string; progressionName: string }[]
  >([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // start a new workout (or restore from an active session)
  useEffect(() => {
    if (!plan) return;
    
    // if there's an active session for this plan, let it be (restore handles it)
    if (activeLog && activeLog.planId === planId) {
       return;
    }

    // if there's an active session for a different plan, we shouldn't be here
    // but if we are, we block starting a new one.
    if (activeLog && activeLog.planId !== planId) {
       Alert.alert('Workout in progress', 'You already have another workout active.');
       router.replace('/');
       return;
    }

    // otherwise, start a new one
    startWorkout(plan).catch(e => {
       Alert.alert('Error', e.message);
       router.replace('/');
    });
  }, [plan?.id]);

  // wall-clock timer tick every second
  useEffect(() => {
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Plan not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this session?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Finish',
          style: 'default',
          onPress: () => {
            // collect exercises that need quality check
            const qcList = exercises
              .filter((ex) => ex.suggestion.qualityCheckDue && ex.qualityCheckResult === undefined)
              .map((ex) => {
                const planEx = plan.exercises.find((e) => e.id === ex.exerciseId);
                const prog = planEx?.progressions.find(
                  (p) => p.id === ex.selectedProgressionId
                );
                return {
                  exerciseId: ex.exerciseId,
                  progressionName: prog?.name ?? 'Exercise',
                };
              });

            if (qcList.length > 0) {
              setQcExercises(qcList);
              setShowQC(true);
            } else {
              finalizeWorkout();
            }
          }
        }
      ]
    );
  };

  const finalizeWorkout = async () => {
    const log = await finishWorkout();
    if (log) {
      await upsertLog(log);
      router.replace('/workout/summary');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout',
      'Cancel this workout? Your progress has been autosaved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
          <Text style={styles.elapsed}>{formatTime(elapsedSeconds)}</Text>
        </View>
        {/* Spacer to keep title centered */}
        <View style={styles.cancelBtn} />
      </View>

      {/* Exercise Cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {plan.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            planExercise={ex}
            streakTarget={profile.streakTarget}
          />
        ))}

        {/* Bottom finish button */}
        <TouchableOpacity style={styles.finishLarge} onPress={handleFinish}>
          <Text style={styles.finishLargeText}>✓ Finish Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quality Check Modal */}
      <QualityCheckModal
        visible={showQC}
        exercisesToCheck={qcExercises}
        onComplete={() => {
          setShowQC(false);
          finalizeWorkout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  planName: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  elapsed: {
    color: Colors.primary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    fontVariant: ['tabular-nums'],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  finishLarge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  finishLargeText: {
    color: '#0d1117',
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bg,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
  },
  errorLink: {
    color: Colors.primary,
    fontSize: Typography.base,
  },
});
