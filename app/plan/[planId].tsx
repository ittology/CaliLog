import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanStore } from '../../stores/usePlanStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { ProgressionEditor } from '../../components/plans/ProgressionEditor';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import type { WorkoutPlan, PlanExercise, Progression } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export default function PlanEditorScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const plans = usePlanStore((s) => s.plans);
  const updatePlan = usePlanStore((s) => s.updatePlan);

  const originalPlan = plans.find((p) => p.id === planId);

  // local editable copy of the plan
  const [plan, setPlan] = useState<WorkoutPlan | null>(originalPlan ?? null);

  useEffect(() => {
    // sync if plan was updated externally
    if (originalPlan && !plan) setPlan(originalPlan);
  }, [originalPlan]);

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

  // helpers

  const updateName = (name: string) => setPlan((p) => p ? { ...p, name } : p);

  const addExercise = () => {
    const newEx: PlanExercise = {
      id: uuidv4(),
      progressions: [
        {
          id: uuidv4(),
          name: '',
          targetSets: 3,
          targetValue: 8,
          unit: 'reps',
          notes: '',
        },
      ],
    };
    setPlan((p) => p ? { ...p, exercises: [...p.exercises, newEx] } : p);
  };

  const removeExercise = (exId: string) => {
    setPlan((p) =>
      p ? { ...p, exercises: p.exercises.filter((e) => e.id !== exId) } : p
    );
  };

  const moveExercise = (exId: string, direction: 'up' | 'down') => {
    setPlan((p) => {
      if (!p) return p;
      const exs = [...p.exercises];
      const idx = exs.findIndex((e) => e.id === exId);
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= exs.length) return p;
      [exs[idx], exs[newIdx]] = [exs[newIdx], exs[idx]];
      return { ...p, exercises: exs };
    });
  };

  const addProgression = (exId: string) => {
    const newProg: Progression = {
      id: uuidv4(),
      name: '',
      targetSets: 3,
      targetValue: 8,
      unit: 'reps',
      notes: '',
    };
    setPlan((p) =>
      p
        ? {
            ...p,
            exercises: p.exercises.map((e) =>
              e.id === exId
                ? { ...e, progressions: [...e.progressions, newProg] }
                : e
            ),
          }
        : p
    );
  };

  const updateProgression = (exId: string, prog: Progression) => {
    setPlan((p) =>
      p
        ? {
            ...p,
            exercises: p.exercises.map((e) =>
              e.id === exId
                ? {
                    ...e,
                    progressions: e.progressions.map((pr) =>
                      pr.id === prog.id ? prog : pr
                    ),
                  }
                : e
            ),
          }
        : p
    );
  };

  const removeProgression = (exId: string, progId: string) => {
    setPlan((p) =>
      p
        ? {
            ...p,
            exercises: p.exercises.map((e) =>
              e.id === exId
                ? { ...e, progressions: e.progressions.filter((pr) => pr.id !== progId) }
                : e
            ),
          }
        : p
    );
  };

  const moveProgression = (exId: string, progId: string, direction: 'up' | 'down') => {
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        exercises: p.exercises.map((e) => {
          if (e.id !== exId) return e;
          const progs = [...e.progressions];
          const idx = progs.findIndex((pr) => pr.id === progId);
          const newIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (newIdx < 0 || newIdx >= progs.length) return e;
          [progs[idx], progs[newIdx]] = [progs[newIdx], progs[idx]];
          return { ...e, progressions: progs };
        }),
      };
    });
  };

  const handleSave = async () => {
    if (!plan.name.trim()) {
      Alert.alert('Plan name required', 'Please enter a name for this plan.');
      return;
    }
    const hasEmptyProg = plan.exercises.some((e) =>
      e.progressions.some((p) => !p.name.trim())
    );
    if (hasEmptyProg) {
      Alert.alert(
        'Empty progression name',
        'Please give each progression a name before saving.'
      );
      return;
    }
    await updatePlan({ ...plan, updatedAt: new Date().toISOString() });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Edit Plan"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* plan name */}
        <View style={styles.field}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.planNameInput}
            value={plan.name}
            onChangeText={updateName}
            placeholder="e.g. Pull Day"
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="done"
          />
        </View>

        {/* exercises */}
        {plan.exercises.map((ex, exIdx) => (
          <View key={ex.id} style={styles.exerciseBlock}>
            {/* exercise header row */}
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseTitle}>
                Exercise {exIdx + 1}
              </Text>
              <View style={styles.exerciseHeaderActions}>
                <TouchableOpacity
                  onPress={() => moveExercise(ex.id, 'up')}
                  disabled={exIdx === 0}
                  style={[styles.moveBtn, exIdx === 0 && styles.moveBtnDisabled]}
                >
                  <Text style={styles.moveBtnText}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveExercise(ex.id, 'down')}
                  disabled={exIdx === plan.exercises.length - 1}
                  style={[styles.moveBtn, exIdx === plan.exercises.length - 1 && styles.moveBtnDisabled]}
                >
                  <Text style={styles.moveBtnText}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Remove Exercise', 'Remove this exercise and all its progressions?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExercise(ex.id) },
                    ]);
                  }}
                  style={styles.removeExBtn}
                >
                  <Text style={styles.removeExText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* progressions */}
            <View style={styles.progressionList}>
              <Text style={styles.progressionListLabel}>
                Progressions (easiest → hardest)
              </Text>
              {ex.progressions.map((prog, progIdx) => (
                <ProgressionEditor
                  key={prog.id}
                  progression={prog}
                  index={progIdx}
                  isFirst={progIdx === 0}
                  isLast={progIdx === ex.progressions.length - 1}
                  onUpdate={(updated) => updateProgression(ex.id, updated)}
                  onDelete={() => {
                    if (ex.progressions.length <= 1) {
                      Alert.alert('Cannot remove', 'An exercise needs at least one progression.');
                      return;
                    }
                    removeProgression(ex.id, prog.id);
                  }}
                  onMoveUp={() => moveProgression(ex.id, prog.id, 'up')}
                  onMoveDown={() => moveProgression(ex.id, prog.id, 'down')}
                />
              ))}
              <TouchableOpacity
                style={styles.addProgBtn}
                onPress={() => addProgression(ex.id)}
              >
                <Text style={styles.addProgText}>+ Add Progression</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* add exercise */}
        <TouchableOpacity style={styles.addExBtn} onPress={addExercise}>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </TouchableOpacity>

        {/* bottom save */}
        <Button
          label="Save Plan"
          variant="primary"
          onPress={handleSave}
          fullWidth
          size="lg"
        />
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
  field: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planNameInput: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    minHeight: MIN_TAP_TARGET + 4,
  },
  exerciseBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  exerciseTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    flex: 1,
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moveBtn: {
    width: 32,
    height: 32,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  moveBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  removeExBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dangerDim,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  removeExText: {
    color: Colors.danger,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  progressionList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  progressionListLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: Typography.semibold,
  },
  addProgBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addProgText: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  addExBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryDim,
  },
  addExText: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  saveBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  saveBtnText: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
    gap: Spacing.md,
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
