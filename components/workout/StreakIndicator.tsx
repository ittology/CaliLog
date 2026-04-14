import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface StreakIndicatorProps {
  streakCount: number;
  streakTarget: number;
  qualityCheckDue?: boolean;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  streakCount,
  streakTarget,
  qualityCheckDue = false,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: streakTarget }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < streakCount
              ? qualityCheckDue
                ? styles.dotComplete
                : styles.dotFilled
              : styles.dotEmpty,
          ]}
        />
      ))}
      {qualityCheckDue && (
        <Text style={styles.qcLabel}>🎬 Record form!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: Colors.streakFilled,
  },
  dotEmpty: {
    backgroundColor: Colors.streakEmpty,
  },
  dotComplete: {
    backgroundColor: Colors.warning,
  },
  qcLabel: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
});
