import React from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, ListItem, T, styles } from '@/components/ui';
import { useFocusData } from '@/lib/hooks';
import { formatMeasure } from '@/lib/measure';
import { latestMeasurement, MEASURE_KINDS } from '@/repo/measurements';
import { useSettings } from '@/store/settings';
import { colors } from '@/theme';

export default function MeasureScreen() {
  const unit = useSettings((s) => s.unit);
  const [latest] = useFocusData(() => Object.fromEntries(MEASURE_KINDS.map((k) => [k.key, latestMeasurement(k.key)])));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <T dim size={13} style={{ marginBottom: 8 }}>Tap a measurement to log it and see its chart.</T>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {MEASURE_KINDS.map((k) => {
          const m = latest[k.key];
          return (
            <ListItem
              key={k.key}
              title={k.label}
              subtitle={m ? formatMeasure(m.value, k.type, unit) : 'No entries'}
              onPress={() => router.push(`/measure/${k.key}`)}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
            />
          );
        })}
      </Card>
    </ScrollView>
  );
}
