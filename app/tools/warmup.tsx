import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { NumberInput } from '@/components/NumberInput';
import { Button, Card, H2, Row, T, styles } from '@/components/ui';
import { calcPlates, defaultWarmup, roundTo } from '@/lib/calc';
import { fmtNum, parseNumber } from '@/lib/units';
import { updateSettings, useSettings } from '@/store/settings';
import { space } from '@/theme';

export default function WarmupScreen() {
  const s = useSettings();
  const unit = s.unit;
  const bar = (unit === 'kg' ? s.barsKg : s.barsLb)[0] ?? 0;
  const plates = unit === 'kg' ? s.platesKg : s.platesLb;
  const step = Math.min(...plates) * 2 || 1;
  const [working, setWorking] = useState<number | null>(unit === 'kg' ? 100 : 225);
  const steps = s.warmup;

  const setStep = (i: number, patch: Partial<(typeof steps)[number]>) =>
    updateSettings({ warmup: steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <T dim size={13}>Working weight ({unit})</T>
        <NumberInput value={working} onChange={setWorking} parse={parseNumber} format={String} style={[styles.input, { fontSize: 24, marginTop: space.sm }]} />
        <T faint size={12} style={{ marginTop: space.sm }}>
          Bar {fmtNum(bar)} {unit}, rounded to {fmtNum(step)} {unit}. Change bars and plates in the plate calculator.
        </T>
      </Card>

      {working != null && (
        <Card>
          <H2>Warm-up sets</H2>
          {steps.map((st, i) => {
            const w = Math.max(bar, roundTo((working * st.percent) / 100, step));
            const p = calcPlates(w, bar, plates).perSide;
            return (
              <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <T bold>{fmtNum(w)} {unit} × {st.reps}</T>
                <T faint size={12}>{st.percent === 0 ? 'bar' : `${st.percent}%`}{p.length ? ` · ${p.map((x) => fmtNum(x)).join(' + ')} /side` : ''}</T>
              </Row>
            );
          })}
        </Card>
      )}

      <Card>
        <H2>Scheme</H2>
        {steps.map((st, i) => (
          <Row key={i} style={{ gap: space.sm, marginBottom: space.sm }}>
            <T dim style={{ width: 50 }}>Set {i + 1}</T>
            <NumberInput value={st.percent} onChange={(v) => setStep(i, { percent: v ?? 0 })} parse={parseNumber} format={String} style={[styles.input, { flex: 1 }]} />
            <T dim>%</T>
            <NumberInput value={st.reps} onChange={(v) => setStep(i, { reps: v ?? 0 })} parse={parseNumber} format={String} style={[styles.input, { flex: 1 }]} />
            <T dim>reps</T>
          </Row>
        ))}
        <Row style={{ gap: space.sm }}>
          <Button title="Add step" small variant="secondary" onPress={() => updateSettings({ warmup: [...steps, { percent: 90, reps: 1 }] })} />
          {steps.length > 1 && <Button title="Remove last" small variant="secondary" onPress={() => updateSettings({ warmup: steps.slice(0, -1) })} />}
          <Button title="Reset" small variant="ghost" onPress={() => updateSettings({ warmup: defaultWarmup })} />
        </Row>
      </Card>
    </ScrollView>
  );
}
