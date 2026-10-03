import React, { useLayoutEffect } from 'react';
import { ScrollView } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { BarChart } from '@/components/Charts';
import { Card, H2, IconButton, ListItem, Row, T, styles } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useFocusData } from '@/lib/hooks';
import { fmtWeight } from '@/lib/units';
import { latestMeasurement } from '@/repo/measurements';
import { startOfWeek, totalWorkouts, workoutsPerWeek } from '@/repo/workouts';
import { useSettings } from '@/store/settings';
import { colors, space } from '@/theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const unit = useSettings((s) => s.unit);
  const [stats] = useFocusData(() => {
    const weeks = workoutsPerWeek(12);
    return {
      total: totalWorkouts(),
      weeks,
      thisWeek: weeks[weeks.length - 1]?.count ?? 0,
      bodyweight: latestMeasurement('bodyweight'),
      streak: weekStreak(weeks),
    };
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'LiftLog',
      headerRight: () => <IconButton name="settings-outline" onPress={() => router.push('/settings')} style={{ marginRight: space.md }} />,
    });
  }, [navigation]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Row style={{ gap: space.md }}>
        <Stat label="Workouts" value={String(stats.total)} />
        <Stat label="This week" value={String(stats.thisWeek)} />
        <Stat label="Week streak" value={String(stats.streak)} />
      </Row>
      {stats.bodyweight && (
        <Card onPress={() => router.push('/measure/bodyweight')}>
          <T dim size={13}>Bodyweight</T>
          <T bold size={20}>{fmtWeight(stats.bodyweight.value, unit)}</T>
        </Card>
      )}
      <Card>
        <H2>Workouts per week</H2>
        <BarChart
          data={stats.weeks.map((w) => ({
            label: new Date(w.weekStart).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
            value: w.count,
          }))}
        />
      </Card>
      <H2 style={{ marginTop: space.md }}>Tools</H2>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ListItem title="Plate calculator" subtitle="What to load on each side of the bar" onPress={() => router.push('/tools/plates')} right={<Chevron />} />
        <ListItem title="Warm-up calculator" subtitle="Warm-up sets for your working weight" onPress={() => router.push('/tools/warmup')} right={<Chevron />} />
        <ListItem title="1RM calculator" subtitle="Estimate your one-rep max and percentages" onPress={() => router.push('/tools/onerm')} right={<Chevron />} />
        <ListItem title="Settings & data" subtitle="Units, rest timer, export, import, backup" onPress={() => router.push('/settings')} right={<Chevron />} />
      </Card>
    </ScrollView>
  );
}

function weekStreak(weeks: { weekStart: number; count: number }[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const isCurrent = weeks[i].weekStart === startOfWeek(Date.now());
    if (weeks[i].count > 0) streak++;
    else if (!isCurrent) break;
  }
  return streak;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center' }}>
      <T bold size={24}>{value}</T>
      <T dim size={12}>{label}</T>
    </Card>
  );
}

function Chevron() {
  return <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />;
}
