import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { NumericInput } from '../ui/NumericInput';
import { useWorkoutStore } from '../../stores/useWorkoutStore';
import type { SetLog } from '../../types';

interface SetRowProps {
  exerciseId: string;
  set: SetLog;
  setIndex: number;
  unit: string; // dynamic unit like 'reps/leg'
  targetValue: number;
  ghostSet?: SetLog;
  isTarget: boolean;
}

export const SetRow: React.FC<SetRowProps> = ({
  exerciseId,
  set,
  setIndex,
  unit,
  targetValue,
  ghostSet,
  isTarget,
}) => {
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const isTimeBased = unit === 'seconds' || unit === 'min';

  // per-set stopwatch
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
  }, [elapsed]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsed(secs);
    
    // save duration regardless of unit
    updateSet(exerciseId, set.id, { duration: secs });
    
    // for time-based exercises, duration is the goal, so mark as completed
    if (isTimeBased) {
      updateSet(exerciseId, set.id, { completed: true });
    }
  }, [exerciseId, isTimeBased, set.id, updateSet]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // auto-complete when a value is entered
  const handleAmountChange = useCallback((v: number | undefined) => {
    const isComplete = v !== undefined && v > 0;
    updateSet(exerciseId, set.id, { amount: v, completed: isComplete });
  }, [exerciseId, set.id, updateSet]);

  const handleDurationChange = useCallback((v: number | undefined) => {
    const isComplete = v !== undefined && v > 0;
    updateSet(exerciseId, set.id, { duration: v, completed: isComplete });
    // sync the visual timer
    if (v !== undefined) setElapsed(v);
  }, [exerciseId, set.id, updateSet]);

  // 99 is the sentinel for "max" — show as placeholder 'Max'
  const placeholder = targetValue === 99 ? 'Max' : String(targetValue);

  // ghost text from last session
  const unitLabel = unit === 'seconds' ? 'sec' : unit;

  const ghostText = ghostSet
    ? isTimeBased
      ? ghostSet.duration !== undefined
        ? `Last: ${ghostSet.duration}s`
        : ''
      : ghostSet.amount !== undefined
      ? `Last: ${ghostSet.amount}`
      : ''
    : '';

  const metTarget =
    set.completed &&
    (isTimeBased
      ? (set.duration ?? 0) >= targetValue
      : (set.amount ?? 0) >= targetValue);

  // format stopwatch display mm:ss
  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  };

  return (
    <View
      style={[
        styles.container,
        set.completed && styles.containerCompleted,
        !isTarget && styles.containerExtra,
      ]}
    >
      {/* Set number indicator (non-interactive) */}
      <View style={[styles.setNumBadge, set.completed && styles.setNumBadgeDone]}>
        <Text style={[styles.setNum, set.completed && styles.setNumDone]}>
          {set.completed ? '✓' : `${setIndex + 1}`}
        </Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputs}>
        {!isTimeBased ? (
          <NumericInput
            value={set.amount}
            onChange={handleAmountChange}
            placeholder={placeholder}
            unit={unitLabel}
            min={0}
            style={styles.mainInput}
          />
        ) : (
          <NumericInput
            value={set.duration}
            onChange={handleDurationChange}
            placeholder={placeholder}
            unit={unitLabel === 'seconds' ? 'sec' : unitLabel}
            min={0}
            style={styles.mainInput}
          />
        )}
      </View>

      {/* Stopwatch */}
      <View style={styles.timerArea}>
        {(running || elapsed > 0) && (
          <Text style={[styles.timerValue, running && styles.timerValueActive]}>
            {formatElapsed(elapsed)}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            if (running) {
              stopTimer();
            } else if (elapsed > 0) {
              resetTimer();
            } else {
              startTimer();
            }
          }}
          style={[styles.timerBtn, running && styles.timerBtnActive]}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.timerBtnText, running && styles.timerBtnTextActive]}>
            {running ? '⏹' : elapsed > 0 ? '↺' : '⏱'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ghost value */}
      {ghostText && !running ? (
        <Text style={styles.ghost} numberOfLines={1}>
          {ghostText}
        </Text>
      ) : null}

      {/* Target met */}
      {metTarget && <Text style={styles.check}></Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerCompleted: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primaryDim,
  },
  containerExtra: {
    opacity: 0.6,
  },
  setNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  setNumBadgeDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  setNum: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  setNumDone: {
    color: '#0d1117',
  },
  inputs: {
    flex: 1,
  },
  mainInput: {
    flex: 1,
  },
  timerArea: {
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  timerValue: {
    color: Colors.textDisabled,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timerValueActive: {
    color: Colors.primary,
  },
  timerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerBtnActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  timerBtnText: {
    fontSize: 13,
  },
  timerBtnTextActive: {
    color: Colors.primary,
  },
  ghost: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    maxWidth: 68,
    textAlign: 'right',
  },
  check: {
    fontSize: 14,
    flexShrink: 0,
  },
});
