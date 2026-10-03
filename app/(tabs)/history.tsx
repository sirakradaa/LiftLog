import React, { useLayoutEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Card, Empty, IconButton, Row, T, styles } from '@/components/ui';
import { useFocusData } from '@/lib/hooks';
import { fmtDate, fmtDurationShort, fmtNum, toDisplayWeight } from '@/lib/units';
import { exerciseName } from '@/repo/exercises';
import { listWorkouts } from '@/repo/workouts';
import { useSettings } from '@/store/settings';
import { space } from '@/theme';
import type { WorkoutSummary } from '@/types';

const PAGE = 50;

export default function HistoryScreen() {
  const navigation = useNavigation();
  const unit = useSettings((s) => s.unit);
  const [limit, setLimit] = useState(PAGE);
  const [workouts] = useFocusData(() => listWorkouts(limit), [limit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <IconButton name="add" onPress={() => router.push('/workout/new')} style={{ marginRight: space.md }} />,
    });
  }, [navigation]);

  const renderItem = ({ item }: { item: WorkoutSummary }) => (
    <Card onPress={() => router.push(`/workout/${item.id}`)}>
      <T bold size={16}>{item.name}</T>
      <T faint size={12} style={{ marginBottom: space.sm }}>{fmtDate(item.startedAt)}</T>
      <Row style={{ gap: space.lg, marginBottom: space.sm }}>
        <T dim size={13}>⏱ {fmtDurationShort(item.durationSec)}</T>
        <T dim size={13}>🏋 {fmtNum(toDisplayWeight(item.volume, unit), 0)} {unit}</T>
        <T dim size={13}>{item.setCount} sets</T>
      </Row>
      {item.exercises.slice(0, 5).map((e, i) => (
        <T key={i} dim size={13} numberOfLines={1}>
          {e.sets} × {exerciseName(e.exerciseId)}
        </T>
      ))}
      {item.exercises.length > 5 && <T faint size={12}>+{item.exercises.length - 5} more</T>}
    </Card>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Empty text="No workouts yet. Finish a workout or tap + to log a past one." />}
        onEndReached={() => workouts.length >= limit && setLimit((l) => l + PAGE)}
      />
    </View>
  );
}
