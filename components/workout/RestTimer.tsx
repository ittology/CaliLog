import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { formatTime } from '../../utils/helpers';

interface RestTimerProps {
  // Alarm target in seconds (0 = no alarm)
  alarmAt?: number;
  onReset?: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ alarmAt = 0, onReset }) => {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [alarming, setAlarming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setAlarming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setSeconds(0);
    onReset?.();
  }, [stop, onReset]);

  const start = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        // alarm check: when we reach the target, vibrate
        if (alarmAt > 0 && next === alarmAt) {
          setAlarming(true);
          Vibration.vibrate([0, 300, 100, 300, 100, 500]);
        }
        return next;
      });
    }, 1000);
  }, [alarmAt]);

  useEffect(() => {
    return () => stop(); // cleanup on unmount
  }, [stop]);

  // pulse animation via alarming state
  const timerColor = alarming ? Colors.timerAlarm : running ? Colors.timerActive : Colors.textSecondary;

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: timerColor }]}>{formatTime(seconds)}</Text>
      <View style={styles.buttons}>
        {!running ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={start}>
            <Text style={styles.btnText}>{seconds > 0 ? 'Resume' : 'Rest'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={stop}>
            <Text style={styles.btnText}>Stop</Text>
          </TouchableOpacity>
        )}
        {seconds > 0 && (
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={reset}>
            <Text style={styles.btnTextSecondary}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  time: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  btn: {
    height: MIN_TAP_TARGET,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnDanger: {
    backgroundColor: Colors.dangerDim,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  btnTextSecondary: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
});
