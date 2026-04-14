import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import type { Progression } from '../../types';

interface ProgressionEditorProps {
  progression: Progression;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updated: Progression) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ProgressionEditor: React.FC<ProgressionEditorProps> = ({
  progression,
  index,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [expanded, setExpanded] = useState(index === 0);

  const p = progression;
  const isSeconds = p.unit === 'seconds';

  return (
    <View style={styles.container}>
      {/* Collapse header */}
      <TouchableOpacity
        style={styles.collapseHeader}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={styles.reorderBtns}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={isFirst}
            style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
          >
            <Text style={styles.reorderIcon}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={isLast}
            style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
          >
            <Text style={styles.reorderIcon}>↓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.collapseInfo}>
          <Text style={styles.collapseTitle} numberOfLines={1}>
            {p.name || `Progression ${index + 1}`}
          </Text>
          <Text style={styles.collapseSubtitle}>
            {p.targetSets}×{p.targetValue}
            {isSeconds ? 's' : ' reps'}
          </Text>
        </View>
        <Text style={styles.collapseArrow}>{expanded ? '▲' : '▼'}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.fields}>
          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={p.name}
              onChangeText={(v) => onUpdate({ ...p, name: v })}
              placeholder="e.g. Tuck Front Lever"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          {/* Max Effort Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Max Effort (Failure)</Text>
            <Switch
              value={!!p.isMax}
              onValueChange={(v) => onUpdate({ ...p, isMax: v })}
              trackColor={{ false: Colors.surfaceRaised, true: Colors.primary }}
              thumbColor={p.isMax ? '#fff' : Colors.textDisabled}
            />
          </View>

          {/* Sets + Target in a row */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Target Sets</Text>
              <TextInput
                style={styles.input}
                value={String(p.targetSets)}
                onChangeText={(v) => onUpdate({ ...p, targetSets: parseInt(v) || 3 })}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
            <View style={[styles.field, { flex: 1, opacity: p.isMax ? 0.3 : 1 }]}>
              <Text style={styles.label}>
                {p.isMax ? 'Target (Max)' : (isSeconds ? 'Target (sec)' : 'Target (reps)')}
              </Text>
              <TextInput
                style={styles.input}
                value={p.isMax ? 'Max' : String(p.targetValue)}
                onChangeText={(v) => !p.isMax && onUpdate({ ...p, targetValue: parseInt(v) || 0 })}
                keyboardType="number-pad"
                placeholder={isSeconds ? '30' : '8'}
                placeholderTextColor={Colors.textDisabled}
                editable={!p.isMax}
              />
            </View>
          </View>

          {/* Unit selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.unitPicker}>
              {(['reps', 'seconds', 'reps/side', 'reps/leg', 'reps/arm'] as const).map((u) => {
                const isActive = p.unit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, isActive && styles.unitBtnActive]}
                    onPress={() => onUpdate({ ...p, unit: u })}
                  >
                    <Text style={[styles.unitBtnText, isActive && styles.unitBtnTextActive]}>
                      {u === 'seconds' ? 'sec' : u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Cues / Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={p.notes}
              onChangeText={(v) => onUpdate({ ...p, notes: v })}
              placeholder="Form cues, key points..."
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Video URL */}
          <View style={styles.field}>
            <Text style={styles.label}>Video URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={p.videoUrl ?? ''}
              onChangeText={(v) => onUpdate({ ...p, videoUrl: v || undefined })}
              placeholder="https://youtube.com/..."
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reorderBtns: {
    flexDirection: 'column',
    gap: 2,
  },
  reorderBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 4,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderIcon: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: Typography.bold,
  },
  collapseInfo: {
    flex: 1,
    gap: 2,
  },
  collapseTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  collapseSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  collapseArrow: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  deleteIcon: {
    fontSize: 18,
  },
  fields: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  input: {
    backgroundColor: Colors.surfaceRaised,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  unitPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  unitBtn: {
    flex: 1,
    minWidth: '30%', // 3 columns on small screens, or grows to fit
    paddingVertical: Spacing.sm,
    minHeight: MIN_TAP_TARGET - 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitBtnActive: {
    backgroundColor: Colors.primary,
  },
  unitBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },
  unitBtnTextActive: {
    color: '#0d1117',
    fontWeight: Typography.bold,
  },
});
