import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { T, styles } from '@/components/ui';
import { fmtDateTime } from '@/lib/units';
import { space } from '@/theme';

export function DateTimeField({ label, value, onChange }: { label: string; value: number; onChange: (ts: number) => void }) {
  if (Platform.OS === 'ios') {
    return (
      <View style={{ marginBottom: space.md }}>
        <T dim size={13} style={{ marginBottom: 4 }}>{label}</T>
        <DateTimePicker
          value={new Date(value)}
          mode="datetime"
          themeVariant="dark"
          onChange={(_, d) => d && onChange(d.getTime())}
        />
      </View>
    );
  }

  const open = () => {
    DateTimePickerAndroid.open({
      value: new Date(value),
      mode: 'date',
      onChange: (e, date) => {
        if (e.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (e2, time) => {
            if (e2.type === 'set' && time) onChange(time.getTime());
          },
        });
      },
    });
  };

  return (
    <View style={{ marginBottom: space.md }}>
      <T dim size={13} style={{ marginBottom: 4 }}>{label}</T>
      <Pressable onPress={open} style={styles.input}>
        <T>{fmtDateTime(value)}</T>
      </Pressable>
    </View>
  );
}
