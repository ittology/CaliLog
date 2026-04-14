import React from 'react';
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
import { useProfileStore } from '../../stores/useProfileStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { formatDate, formatDurationHuman, formatTime12h } from '../../utils/helpers';

export default function SessionDetailScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const history = useProfileStore((s) => s.history);
  const deleteLog = useProfileStore((s) => s.deleteLog);

  const log = history.find((h) => h.id === logId);

  if (!log) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Session" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found.</Text>
        </View>
      </View>
    );
  }


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={log.planName} subtitle={formatDate(log.date)} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary strip */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatDurationHuman(log.duration)}</Text>
            <Text style={styles.summaryLabel}>Duration</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatTime12h(log.date)}</Text>
            <Text style={styles.summaryLabel}>Time</Text>
          </View>
        </View>

        {/* Exercises */}
        {log.exercises.map((ex, i) => (
          <View key={i} style={styles.exCard}>
            <View style={styles.exHeader}>
              <Text style={styles.exName}>{ex.progressionName}</Text>
              <View style={styles.exBadges}>
                {ex.targetsMet && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeSuccess}>✓ Target</Text>
                  </View>
                )}
                {ex.qualityCheckPassed === true && (
                  <View style={[styles.badge, styles.badgeWarning]}>
                    <Text style={styles.badgeWarningText}>↑ Advancing</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.streakText}>Streak: {ex.streakCount}</Text>

            {/* Set breakdown */}
            {ex.sets.map((set, si) => (
              <View
                key={set.id}
                style={[styles.setRow, !set.completed && styles.setRowSkipped]}
              >
                <Text style={styles.setNum}>Set {si + 1}</Text>
                {/* Show both if available */}
                <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
                  {set.amount !== undefined && (
                    <Text style={styles.setValue}>{set.amount} {ex.unit === 'seconds' ? 'sec' : (ex.unit ?? 'reps')}</Text>
                  )}
                  {set.amount !== undefined && set.duration !== undefined && set.duration > 0 && (
                    <Text style={styles.setMeta}>·</Text>
                  )}
                  {set.duration !== undefined && set.duration > 0 && (
                    <Text style={styles.setValue}>{set.duration}s</Text>
                  )}
                </View>
                {set.weight !== undefined && set.weight > 0 && (
                  <Text style={styles.setMeta}>+{set.weight}kg</Text>
                )}
                {!set.completed && (
                  <Text style={styles.setSkipped}>(skipped)</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Notes */}
        {log.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{log.notes}</Text>
          </View>
        ) : null}
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
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    textAlign: 'center',
  },
  exCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  exName: {
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    flex: 1,
  },
  exBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: Colors.successDim,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  badgeSuccess: {
    color: Colors.success,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  badgeWarning: {
    backgroundColor: Colors.warningDim,
    borderColor: Colors.warning,
  },
  badgeWarningText: {
    color: Colors.warning,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  streakText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  setRowSkipped: {
    opacity: 0.4,
  },
  setNum: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    width: 48,
  },
  setValue: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  setMeta: {
    color: Colors.primary,
    fontSize: Typography.sm,
  },
  setSkipped: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    fontStyle: 'italic',
  },
  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  notesLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
  },
  notesText: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
  },
});
