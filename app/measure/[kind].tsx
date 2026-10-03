import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { LineChart } from '@/components/Charts';
import { DateTimeField } from '@/components/DateTimeField';
import { NumberInput } from '@/components/NumberInput';
import { Button, Card, H2, ListItem, T, styles } from '@/components/ui';
import { useFocusData } from '@/lib/hooks';
import { formatMeasure, fromDisplayMeasure, measureUnit, toDisplayMeasure } from '@/lib/measure';
import { fmtDateTime, fmtNum, parseNumber } from '@/lib/units';
import { addMeasurement, deleteMeasurement, listMeasurements, MEASURE_KINDS } from '@/repo/measurements';
import { useSettings } from '@/store/settings';
import { space } from '@/theme';

export default function MeasureDetailScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const def = MEASURE_KINDS.find((k) => k.key === kind) ?? { key: kind, label: kind, type: 'length' as const };
  const unit = useSettings((s) => s.unit);
  const [entries, reload] = useFocusData(() => listMeasurements(kind), [kind]);
  const [value, setValue] = useState<number | null>(null);
  const [at, setAt] = useState(Date.now());

  const add = () => {
    if (value == null) return;
    addMeasurement(kind, fromDisplayMeasure(value, def.type, unit), at);
    setValue(null);
    setAt(Date.now());
    reload();
  };

  const chart = [...entries].reverse().map((m) => ({ x: m.measuredAt, y: toDisplayMeasure(m.value, def.type, unit) }));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: def.label }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <H2>Log {def.label.toLowerCase()}</H2>
          <T dim size={13} style={{ marginBottom: 4 }}>Value ({measureUnit(def.type, unit)})</T>
          <NumberInput value={value} onChange={setValue} parse={parseNumber} format={(v) => String(v)} style={[styles.input, { marginBottom: space.md }]} />
          <DateTimeField label="When" value={at} onChange={setAt} />
          <Button title="Add entry" onPress={add} disabled={value == null} />
        </Card>
        <Card>
          <H2>Progress</H2>
          <LineChart data={chart} formatY={(v) => fmtNum(v, 1)} />
        </Card>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {entries.length === 0 ? (
            <T faint style={{ padding: space.lg }}>No entries yet.</T>
          ) : (
            entries.map((m) => (
              <ListItem
                key={m.id}
                title={formatMeasure(m.value, def.type, unit)}
                subtitle={fmtDateTime(m.measuredAt)}
                onLongPress={() =>
                  Alert.alert('Delete entry?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        deleteMeasurement(m.id);
                        reload();
                      },
                    },
                  ])
                }
              />
            ))
          )}
        </Card>
        {entries.length > 0 && <T faint size={12}>Long-press an entry to delete it.</T>}
      </ScrollView>
    </View>
  );
}
