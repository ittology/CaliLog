import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '../../stores/useProfileStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { formatDurationHuman, formatDate } from '../../utils/helpers';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const history = useProfileStore((s) => s.history);

  // the most recent completed log
  const log = history.find((h) => h.status === 'completed');

  if (!log) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>No recent workout found.</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.link}>Go home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const metCount = log.exercises.filter((e) => e.targetsMet).length;
  const advancedCount = log.exercises.filter(
    (e) => e.qualityCheckPassed === true
  ).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trophy Header */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🏆</Text>
          <Text style={styles.heroTitle}>Workout Complete!</Text>
          <Text style={styles.heroDate}>{formatDate(log.date)}</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDurationHuman(log.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{metCount}</Text>
            <Text style={styles.statLabel}>Targets Met</Text>
          </View>
          {advancedCount > 0 && (
            <View style={[styles.statCard, { borderColor: Colors.warning }]}>
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {advancedCount} 
              </Text>
              <Text style={styles.statLabel}>Advancing!</Text>
            </View>
          )}
        </View>

        {/* Per-exercise results */}
        <Text style={styles.sectionTitle}>Exercise Results</Text>
        {log.exercises.map((ex, i) => (
          <View key={i} style={styles.exRow}>
            <View style={styles.exLeft}>
              <View style={styles.exNameRow}>
                <Text style={styles.exName}>{ex.progressionName}</Text>
                {ex.targetsMet && <Text style={styles.exBadge}>✓ Target</Text>}
                {ex.qualityCheckPassed === true && (
                  <Text style={[styles.exBadge, styles.exBadgeAdvance]}>
                    ↑ Advancing
                  </Text>
                )}
              </View>
              <Text style={styles.exSets}>
                {ex.sets.filter((s) => s.completed).length} sets completed ·{' '}
                Streak: {ex.streakCount}
              </Text>
            </View>
          </View>
        ))}

        {/* Actions */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  heroEmoji: {
    fontSize: 64,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  heroDate: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
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
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  exRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  exNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  exName: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    flex: 1,
  },
  exBadge: {
    backgroundColor: Colors.successDim,
    color: Colors.success,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  exBadgeAdvance: {
    backgroundColor: Colors.warningDim,
    color: Colors.warning,
    borderColor: Colors.warning,
  },
  exSets: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  homeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: MIN_TAP_TARGET + 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  homeBtnText: {
    color: '#0d1117',
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.base,
    textAlign: 'center',
  },
});
