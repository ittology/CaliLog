import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { StreakIndicator } from './StreakIndicator';
import { SetRow } from './SetRow';
import { useWorkoutStore } from '../../stores/useWorkoutStore';
import type { PlanExercise } from '../../types';

interface ExerciseCardProps {
  planExercise: PlanExercise;
  streakTarget: number;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  planExercise,
  streakTarget,
}) => {
  const [expanded, setExpanded] = useState(false);

  const exState = useWorkoutStore((s) =>
    s.exercises.find((e) => e.exerciseId === planExercise.id)
  );
  const selectProgression = useWorkoutStore((s) => s.selectProgression);

  if (!exState) return null;

  const currentProgression =
    planExercise.progressions.find(
      (p) => p.id === exState.selectedProgressionId
    ) ?? planExercise.progressions[0];

  const { suggestion, sets } = exState;

  const isSeconds = currentProgression.unit === 'seconds';
  // 99 is the sentinel value for "max" (no fixed target)
  const displayTarget = currentProgression.targetValue === 99
    ? 'Max'
    : String(currentProgression.targetValue);

  return (
    <View style={styles.card}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => planExercise.progressions.length > 1 && setExpanded((v) => !v)}
          activeOpacity={planExercise.progressions.length > 1 ? 0.7 : 1}
        >
          <View style={styles.nameRow}>
            <Text style={styles.progressionName} numberOfLines={2}>
              {currentProgression.name}
            </Text>
            {planExercise.progressions.length > 1 && (
              <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            )}
          </View>
          <StreakIndicator
            streakCount={suggestion.streakCount}
            streakTarget={streakTarget}
            qualityCheckDue={suggestion.qualityCheckDue}
          />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.targetLabel}>
            {currentProgression.targetSets} × {displayTarget}{isSeconds ? 's' : ' reps'}
          </Text>
        </View>
      </View>


      {expanded && (
        <View style={styles.progList}>
          {planExercise.progressions
            .slice()
            .sort((a, b) => (a.id === exState.selectedProgressionId ? -1 : b.id === exState.selectedProgressionId ? 1 : 0))
            .map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.progItem,
                  p.id === exState.selectedProgressionId && styles.progItemActive,
                ]}
                onPress={() => {
                  selectProgression(planExercise.id, p.id);
                  setExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.progItemText,
                    p.id === exState.selectedProgressionId && styles.progItemTextActive,
                  ]}
                >
                  {p.name}
                </Text>
                <Text style={styles.progItemTarget}>
                  {p.targetSets}×{p.targetValue}
                  {p.unit === 'seconds' ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* notes and cues */}
      {currentProgression.notes ? (
        <Text style={styles.notes}>{currentProgression.notes}</Text>
      ) : null}

      {/* link to form video */}
      {currentProgression.videoUrl ? (
        <TouchableOpacity
          style={styles.videoBtn}
          onPress={() => {
            if (currentProgression.videoUrl) {
              Linking.openURL(currentProgression.videoUrl).catch(() =>
                Alert.alert('Could not open video link')
              );
            }
          }}
        >
          <Text style={styles.videoBtnText}>▶ Form Video</Text>
        </TouchableOpacity>
      ) : null}

      {/* visual divider */}
      <View style={styles.divider} />

      {/* table headers for sets */}
      <View style={styles.setHeader}>
        <Text style={styles.setHeaderLabel}>Set</Text>
        <View style={styles.setHeaderInputs}>
          <Text style={[styles.setHeaderCol, { flex: 1 }]}>
            {isSeconds ? 'Seconds' : 'Reps'}
          </Text>
        </View>
        <Text style={styles.setHeaderTimer}>Timer</Text>
        <Text style={styles.setHeaderGhost}>Last</Text>
      </View>

      {/* rows for each training set */}
      {sets.map((s, i) => (
        <SetRow
          key={s.id}
          exerciseId={planExercise.id}
          set={s}
          setIndex={i}
          unit={currentProgression.unit}
          targetValue={currentProgression.targetValue}
          ghostSet={suggestion.lastSets[i]}
          isTarget={i < currentProgression.targetSets}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressionName: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  chevron: {
    color: Colors.primary,
    fontSize: Typography.xs,
    marginTop: 2,
  },
  targetLabel: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  progList: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progItemActive: {
    backgroundColor: Colors.primaryDim,
  },
  progItemText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    flex: 1,
  },
  progItemTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  progItemTarget: {
    color: Colors.textDisabled,
    fontSize: Typography.sm,
  },
  notes: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  videoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dangerDim,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  videoBtnText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
  },
  setHeaderLabel: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    width: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setHeaderInputs: {
    flex: 1,
    flexDirection: 'row',
  },
  setHeaderCol: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setHeaderTimer: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    width: 36,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setHeaderGhost: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    width: 68,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
});
