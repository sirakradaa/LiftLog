import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { NumberInput } from '@/components/NumberInput';
import { Card, H2, Row, T, styles } from '@/components/ui';
import { brzycki1RM, estimate1RM } from '@/lib/calc';
import { fmtNum, parseNumber } from '@/lib/units';
import { useSettings } from '@/store/settings';
import { space } from '@/theme';

const PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
// Approximate reps achievable at each %1RM.
const REPS_AT: Record<number, string> = { 100: '1', 95: '2', 90: '4', 85: '6', 80: '8', 75: '10', 70: '12', 65: '15', 60: '20', 55: '24', 50: '30' };

export default function OneRepMaxScreen() {
  const unit = useSettings((s) => s.unit);
  const [weight, setWeight] = useState<number | null>(unit === 'kg' ? 100 : 225);
  const [reps, setReps] = useState<number | null>(5);

  const epley = weight && reps ? estimate1RM(weight, reps) : 0;
  const brz = weight && reps ? brzycki1RM(weight, reps) : 0;
  const max = epley && brz ? (epley + brz) / 2 : epley;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Row style={{ gap: space.md }}>
          <View style={{ flex: 1 }}>
            <T dim size={13}>Weight ({unit})</T>
            <NumberInput value={weight} onChange={setWeight} parse={parseNumber} format={String} style={[styles.input, { marginTop: 4 }]} />
          </View>
          <View style={{ flex: 1 }}>
            <T dim size={13}>Reps</T>
            <NumberInput value={reps} onChange={setReps} parse={parseNumber} format={String} keyboardType="number-pad" style={[styles.input, { marginTop: 4 }]} />
          </View>
        </Row>
      </Card>
      {max > 0 && (
        <>
          <Card style={{ alignItems: 'center' }}>
            <T dim size={13}>Estimated 1RM</T>
            <T bold size={34}>{fmtNum(max, 1)} {unit}</T>
            <T faint size={12}>Epley {fmtNum(epley, 1)} · Brzycki {fmtNum(brz, 1)}</T>
          </Card>
          <Card>
            <H2>Percentages</H2>
            {PERCENTS.map((p) => (
              <Row key={p} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <T dim style={{ width: 50 }}>{p}%</T>
                <T bold>{fmtNum((max * p) / 100, 1)} {unit}</T>
                <T faint size={12} style={{ width: 70, textAlign: 'right' }}>~{REPS_AT[p]} reps</T>
              </Row>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
