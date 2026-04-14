import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanStore } from '../../stores/usePlanStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useWorkoutStore } from '../../stores/useWorkoutStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { formatDate, formatDurationHuman } from '../../utils/helpers';
import { Alert } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlanStore((s) => s.plans);
  const activeLog = useWorkoutStore((s) => s.activeLog);
  const initStore = useWorkoutStore((s) => s.initStore);
  const history = useProfileStore((s) => s.history);
  const isLoaded = useProfileStore((s) => s.isLoaded);

  React.useEffect(() => {
    if (isLoaded) {
      initStore();
    }
  }, [isLoaded]);

  const lastWorkout = history.find((h) => h.status === 'completed');

  const totalWorkouts = history.filter((h) => h.status === 'completed').length;

  // count how many workouts were done this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = history.filter(
    (h) => h.status === 'completed' && new Date(h.date) >= weekStart
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* logo and app title */}
      <View style={styles.hero}>
        <Text style={styles.logo}>💪</Text>
        <Text style={styles.appName}>CaliLog</Text>
        <Text style={styles.tagline}>Open-Source Calisthenics Tracker</Text>
      </View>

      {/* statistics summary cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <Text style={[styles.statValue, styles.statValueAccent]}>{thisWeek}</Text>
          <Text style={styles.statLabel}>Weekly Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{plans.length}</Text>
          <Text style={styles.statLabel}>Total Plans</Text>
        </View>
      </View>

      {/* active workout session if one exists */}
      {activeLog && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Session</Text>
          <TouchableOpacity
            style={[styles.lastWorkoutCard, { borderColor: Colors.primary, backgroundColor: Colors.primaryDim }]}
            onPress={() => router.push(`/workout/${activeLog.planId}`)}
            activeOpacity={0.8}
          >
            <View style={styles.lastWorkoutLeft}>
              <Text style={[styles.lastWorkoutPlan, { color: Colors.primary }]}>
                {activeLog.planName} (Ongoing)
              </Text>
              <Text style={styles.lastWorkoutDate}>Started {formatDate(activeLog.date)}</Text>
              <Text style={styles.lastWorkoutMeta}>
                Tap to return to your workout
              </Text>
            </View>
            <View style={styles.resumeBadge}>
              <Text style={styles.resumeBadgeText}>RESUME</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* show the most recent completed workout */}
      {!activeLog && lastWorkout && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Session</Text>
          <TouchableOpacity
            style={styles.lastWorkoutCard}
            onPress={() => router.push(`/history/${lastWorkout.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.lastWorkoutLeft}>
              <Text style={styles.lastWorkoutPlan}>{lastWorkout.planName}</Text>
              <Text style={styles.lastWorkoutDate}>{formatDate(lastWorkout.date)}</Text>
              <Text style={styles.lastWorkoutMeta}>
                {lastWorkout.exercises.length} exercises ·{' '}
                {formatDurationHuman(lastWorkout.duration)}
              </Text>
            </View>
            <Text style={styles.lastWorkoutArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* list of plans to start a new workout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Start Workout</Text>
        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No plans yet.</Text>
            <TouchableOpacity onPress={() => router.push('/plans')}>
              <Text style={styles.emptyLink}>Create your first plan →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan) => {
            const isSelectable = !activeLog || activeLog.planId === plan.id;
            
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, !isSelectable && styles.planCardDisabled]}
                onPress={() => {
                  if (activeLog && activeLog.planId !== plan.id) {
                    Alert.alert('Workout in progress', 'Please finish your current workout before starting another.');
                    return;
                  }
                  router.push(`/workout/${plan.id}`);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.planLeft}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>
                    {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[styles.startBadge, !isSelectable && styles.startBadgeDisabled]}>
                  <Text style={styles.startBadgeText}>
                    {activeLog?.planId === plan.id ? 'RESUME' : 'START'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* shortcuts to other screens */}
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/history')}>
          <Text style={styles.quickLinkIcon}>📋</Text>
          <Text style={styles.quickLinkText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/plans')}>
          <Text style={styles.quickLinkIcon}>📝</Text>
          <Text style={styles.quickLinkText}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/analytics' as any)}>
          <Text style={styles.quickLinkIcon}>📊</Text>
          <Text style={styles.quickLinkText}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  logo: {
    fontSize: 56,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statCardAccent: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  statValueAccent: {
    color: Colors.primary,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastWorkoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastWorkoutLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  lastWorkoutPlan: {
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  lastWorkoutDate: {
    color: Colors.primary,
    fontSize: Typography.sm,
  },
  lastWorkoutMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  lastWorkoutArrow: {
    color: Colors.textDisabled,
    fontSize: 24,
    fontWeight: Typography.regular,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TAP_TARGET + 20,
  },
  planLeft: {
    flex: 1,
    gap: 4,
  },
  planName: {
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  planMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  startBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  startBadgeText: {
    color: '#0d1117',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
  },
  emptyLink: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickLink: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MIN_TAP_TARGET + 8,
    justifyContent: 'center',
  },
  quickLinkIcon: {
    fontSize: 22,
  },
  quickLinkText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
  },
  resumeBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  resumeBadgeText: {
    color: '#0d1117',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  startBadgeDisabled: {
    backgroundColor: Colors.surfaceRaised,
  },
});
