import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlanStore } from '../../stores/usePlanStore';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlanStore((s) => s.plans);
  const createPlan = usePlanStore((s) => s.createPlan);
  const deletePlan = usePlanStore((s) => s.deletePlan);
  const duplicatePlan = usePlanStore((s) => s.duplicatePlan);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const plan = await createPlan(name);
    setNewName('');
    setShowCreate(false);
    router.push(`/plan/${plan.id}`);
  };

  const handleDelete = (planId: string, planName: string) => {
    Alert.alert(
      'Delete Plan',
      `Delete "${planName}"? All progressions in this plan will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlan(planId) },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Plans"
        rightElement={
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={styles.addBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, plans.length === 0 && { flexGrow: 1 }]}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="No plans yet"
            message="Tap ＋ to create your first workout plan, or use our pre-built templates."
          />
        }
        renderItem={({ item: plan }) => (
          <View style={styles.planCard}>
            <TouchableOpacity
              style={styles.planMain}
              onPress={() => router.push(`/plan/${plan.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planMeta}>
                {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
                {plan.exercises.length > 0 &&
                  ` · ${plan.exercises.reduce((s, e) => s + e.progressions.length, 0)} progressions`}
              </Text>
            </TouchableOpacity>
            <View style={styles.planActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/workout/${plan.id}`)}
              >
                <Text style={styles.actionBtnPlay}>▶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => duplicatePlan(plan.id)}
              >
                <Text style={styles.actionBtnIcon}>⎘</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleDelete(plan.id, plan.name)}
              >
                <Text style={styles.actionBtnIconDanger}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* modal for creating a new plan */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Plan</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Pull Day, Push Day…"
              placeholderTextColor={Colors.textDisabled}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalButtons}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => { setShowCreate(false); setNewName(''); }}
                style={{ flex: 1 }}
              />
              <Button
                label="Create"
                variant="primary"
                onPress={handleCreate}
                disabled={!newName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TAP_TARGET + 20,
    overflow: 'hidden',
  },
  planMain: {
    flex: 1,
    padding: Spacing.base,
    gap: Spacing.xs,
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
  planActions: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  actionBtn: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET + 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  actionBtnDanger: {
    backgroundColor: Colors.dangerDim,
  },
  actionBtnPlay: {
    color: Colors.primary,
    fontSize: 18,
  },
  actionBtnIcon: {
    color: Colors.textSecondary,
    fontSize: 18,
  },
  actionBtnIconDanger: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: MIN_TAP_TARGET,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
