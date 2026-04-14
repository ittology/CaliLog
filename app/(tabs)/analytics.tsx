import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CartesianChart,
  Line,
  Area,
  useChartPressState,
} from 'victory-native';
import { matchFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { useProfileStore } from '../../stores/useProfileStore';
import { usePlanStore } from '../../stores/usePlanStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { formatDate } from '../../utils/helpers';
import { ExerciseLog } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const history = useProfileStore((s) => s.history);
  const profile = useProfileStore((s) => s.profile);
  const plans = usePlanStore((s) => s.plans);

  // data processing

  const weightData = useMemo(() => {
    return profile.bodyWeightLog
      .map((e) => ({
        date: new Date(e.date).getTime(),
        value: e.weight,
        label: formatDate(e.date),
      }))
      .reverse(); // oldest to newest
  }, [profile.bodyWeightLog]);

  const durationData = useMemo(() => {
    return history
      .map((h) => ({
        date: new Date(h.date).getTime(),
        value: Math.round(h.duration / 60), // minutes
        label: formatDate(h.date),
      }))
      .reverse();
  }, [history]);

  const restTimeData = useMemo(() => {
    return history
      .map((h) => {
        const totalActiveSeconds = h.exercises.reduce((acc, ex) => {
          return acc + ex.sets.reduce((sAcc, s) => sAcc + (s.duration || 0), 0);
        }, 0);
        const restSecs = Math.max(0, h.duration - totalActiveSeconds);
        return {
          date: new Date(h.date).getTime(),
          value: Math.round(restSecs / 60), // minutes
          label: formatDate(h.date),
        };
      })
      .reverse();
  }, [history]);

  // render helpers

  const font = matchFont({
    fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif' }),
    fontSize: 10,
    fontWeight: 'bold',
  });

  const renderChart = (title: string, data: any[], color: string, unit: string) => {
    if (data.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.emptyChartContent}>
            <Text style={styles.emptyText}>Not enough data to graph yet.</Text>
          </View>
        </View>
      );
    }

    const average = data.length > 0 
      ? (data.reduce((acc, curr) => acc + curr.value, 0) / data.length).toFixed(title.includes('Weight') ? 1 : 0)
      : 0;

    const startDate = data[0].label;
    const endDate = data[data.length - 1].label;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.avgBadge}>
            <Text style={styles.avgLabel}>AVG: {average} {unit}</Text>
          </View>
        </View>

        <View style={{ height: 220, width: '100%', marginTop: Spacing.sm }}>
            <CartesianChart 
                data={data} 
                xKey="date" 
                yKeys={["value"]}
                padding={{ top: 10, bottom: 10, left: 35, right: 10 }}
                domainPadding={{ left: 20, right: 20, top: 40, bottom: 20 }}
                axisOptions={{
                  font,
                  tickCount: 5,
                  labelColor: Colors.textDisabled,
                  lineColor: 'transparent',
                  labelOffset: 8,
                  formatXLabel: () => "",
                }}
            >
                {({ points, chartBounds }) => (
                  <>
                    <Line points={points.value} color={color} strokeWidth={3} animate={{ type: 'timing', duration: 500 }} />
                    {/* Vertical markers at each point */}
                    {points.value.map((p, i) => {
                      if (p.y === null || p.y === undefined) return null;
                      return (
                        <Line 
                          key={i}
                          points={[
                            { ...p, y: chartBounds.top }, 
                            { ...p, y: chartBounds.bottom }
                          ]}
                          color={Colors.border}
                          strokeWidth={1}
                          opacity={0.2}
                        />
                      );
                    })}
                  </>
                )}
            </CartesianChart>
        </View>

        <View style={styles.xAxis}>
          <Text style={styles.xLabel}>{startDate}</Text>
          <Text style={styles.xLabel}>{endDate}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Analytics" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderChart("Body Weight", weightData, Colors.success, "kg")}
        {renderChart("Workout Duration", durationData, Colors.success, "min")}
        {renderChart("Rest Time", restTimeData, Colors.success, "min")}
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
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  chartTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avgBadge: {
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avgLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  emptyChart: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    height: 200,
    justifyContent: 'center',
  },
  emptyChartContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textDisabled,
    fontSize: Typography.sm,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.xs,
    paddingHorizontal: 4,
  },
  xLabel: {
    color: Colors.textDisabled,
    fontSize: 10,
    fontWeight: Typography.medium,
  },
});
