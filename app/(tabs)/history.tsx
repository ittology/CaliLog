import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '../../stores/useProfileStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { formatDate, formatDurationHuman, groupBy } from '../../utils/helpers';
import type { WorkoutLog } from '../../types';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export default function HistoryScreen() {
  const router = useRouter();
  const history = useProfileStore((s) => s.history);
  const deleteLog = useProfileStore((s) => s.deleteLog);

  const completed = history.filter((h) => h.status === 'completed');

  // group by month
  const grouped = groupBy(completed, (log) => {
    const d = new Date(log.date);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });
  const sections = Object.entries(grouped).map(([title, data]) => ({ title, data }));

  const handleDelete = (log: WorkoutLog) => {
    Alert.alert(
      'Delete Session',
      `Delete the workout on ${formatDate(log.date)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLog(log.id),
        },
      ]
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="History" />

      {completed.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No sessions yet"
          message="Complete your first workout to see it here."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.monthHeader}>{section.title}</Text>
          )}
          renderItem={({ item: log }) => {
            const displayIndex = history.findIndex(h => h.id === log.id);
            const logIndex = history.length - 1 - displayIndex;
            
            return (
              <TouchableOpacity
                style={styles.logCard}
                onPress={() => router.push(`/history/${log.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.logIndex}>
                  <Text style={styles.logIndexText}>#{logIndex}</Text>
                </View>
                <View style={styles.logLeft}>
                  <Text style={styles.logPlan}>{log.planName}</Text>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  <View style={styles.logMeta}>
                    <Text style={styles.logMetaText}>
                      ⏱ {formatDurationHuman(log.duration)}
                    </Text>
                    <Text style={styles.logMetaDot}>·</Text>
                    <Text style={styles.logMetaText}>
                      {log.exercises.length} exercises
                    </Text>
                    {log.exercises.some((e) => e.targetsMet) && (
                      <>
                        <Text style={styles.logMetaDot}>·</Text>
                        <Text style={styles.logMetaSuccess}>
                          {log.exercises.filter((e) => e.targetsMet).length} ✓
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(log)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  list: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  monthHeader: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TAP_TARGET + 20,
    marginBottom: Spacing.sm,
  },
  logLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  logIndex: {
    minWidth: 36,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logIndexText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  logPlan: {
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  logDate: {
    color: Colors.primary,
    fontSize: Typography.sm,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  logMetaText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  logMetaDot: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
  },
  logMetaSuccess: {
    color: Colors.success,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  deleteBtn: {
    padding: Spacing.sm,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    textAlign: 'center',
  },
});
