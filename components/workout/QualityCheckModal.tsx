import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { useWorkoutStore } from '../../stores/useWorkoutStore';
import type { WorkoutPlan } from '../../types';

interface QualityCheckModalProps {
  visible: boolean;
  // Exercises that need a quality check — exerciseIds with qualityCheckDue=true
  exercisesToCheck: { exerciseId: string; progressionName: string }[];
  onComplete: () => void;
}

export const QualityCheckModal: React.FC<QualityCheckModalProps> = ({
  visible,
  exercisesToCheck,
  onComplete,
}) => {
  const setQualityCheckResult = useWorkoutStore((s) => s.setQualityCheckResult);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const current = exercisesToCheck[currentIdx];

  const handleAnswer = (passed: boolean) => {
    if (!current) return;
    setQualityCheckResult(current.exerciseId, passed);
    const newResults = { ...results, [current.exerciseId]: passed };
    setResults(newResults);

    if (currentIdx + 1 < exercisesToCheck.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      setCurrentIdx(0);
      setResults({});
      onComplete();
    }
  };

  if (!current) return null;

  const progress = `${currentIdx + 1} / ${exercisesToCheck.length}`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🎬 Quality Check</Text>
          </View>

          <Text style={styles.progress}>{progress}</Text>

          <Text style={styles.exerciseName} numberOfLines={3}>
            {current.progressionName}
          </Text>

          <Text style={styles.body}>
            You've hit your targets 3 times in a row!{'\n\n'}
            Did you record your form and are you satisfied with your technique?{'\n\n'}
            <Text style={styles.hint}>
              If yes → you'll advance to the next progression next session.{'\n'}
              If no → keep practicing at this level.
            </Text>
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnNo]}
              onPress={() => handleAnswer(false)}
            >
              <Text style={styles.btnText}>✗ Not yet</Text>
              <Text style={styles.btnSub}>Stay here</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnYes]}
              onPress={() => handleAnswer(true)}
            >
              <Text style={styles.btnText}>✓ Yes!</Text>
              <Text style={styles.btnSub}>Move up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning,
    alignItems: 'center',
    width: '100%',
    gap: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.warningDim,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  badgeText: {
    color: Colors.warning,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  progress: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    color: Colors.textDisabled,
    fontSize: Typography.sm,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    minHeight: MIN_TAP_TARGET + 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
  },
  btnNo: {
    backgroundColor: Colors.dangerDim,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnYes: {
    backgroundColor: Colors.successDim,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  btnSub: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
});
