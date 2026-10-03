import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { NumberInput } from '@/components/NumberInput';
import { Button, Card, Chip, ChipRow, H2, Row, T, styles } from '@/components/ui';
import { calcPlates } from '@/lib/calc';
import { fmtNum, parseNumber } from '@/lib/units';
import { updateSettings, useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme';

const PLATE_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#f3f4f6', '#6b7280', '#a855f7'];

export default function PlateCalculatorScreen() {
  const s = useSettings();
  const unit = s.unit;
  const bars = unit === 'kg' ? s.barsKg : s.barsLb;
  const plates = unit === 'kg' ? s.platesKg : s.platesLb;
  const [target, setTarget] = useState<number | null>(unit === 'kg' ? 100 : 225);
  const [bar, setBar] = useState(bars[0] ?? 0);
  const [newBar, setNewBar] = useState<number | null>(null);
  const [newPlate, setNewPlate] = useState<number | null>(null);
  const [disabledPlates, setDisabledPlates] = useState<number[]>([]);

  const active = plates.filter((p) => !disabledPlates.includes(p));
  const result = target != null ? calcPlates(target, bar, active) : null;
  const sorted = [...plates].sort((a, b) => b - a);

  const setBars = (list: number[]) => updateSettings(unit === 'kg' ? { barsKg: list } : { barsLb: list });
  const setPlates = (list: number[]) => updateSettings(unit === 'kg' ? { platesKg: list } : { platesLb: list });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <T dim size={13}>Target weight ({unit})</T>
        <NumberInput value={target} onChange={setTarget} parse={parseNumber} format={(v) => String(v)} style={[styles.input, { fontSize: 24, marginVertical: space.sm }]} />
        <T dim size={13} style={{ marginBottom: 4 }}>Bar</T>
        <ChipRow>
          {bars.map((b) => (
            <Chip key={b} label={b === 0 ? 'No bar' : `${fmtNum(b)} ${unit}`} selected={bar === b} onPress={() => setBar(b)} />
          ))}
        </ChipRow>
      </Card>

      {result && (
        <Card>
          <H2>Per side</H2>
          {result.perSide.length === 0 ? (
            <T dim>Just the bar.</T>
          ) : (
            <>
              <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: space.md, alignItems: 'center' }}>
                <View style={{ width: 24, height: 10, backgroundColor: colors.textFaint, borderRadius: 2 }} />
                {result.perSide.map((p, i) => {
                  const idx = sorted.indexOf(p);
                  const h = 40 + (p / sorted[0]) * 60;
                  return (
                    <View
                      key={i}
                      style={{
                        width: 22,
                        height: h,
                        backgroundColor: PLATE_COLORS[idx % PLATE_COLORS.length],
                        borderRadius: radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T size={9} bold style={{ color: '#000', transform: [{ rotate: '-90deg' }], width: 40, textAlign: 'center' }}>
                        {fmtNum(p)}
                      </T>
                    </View>
                  );
                })}
              </Row>
              <T>{summarize(result.perSide)} ({unit})</T>
            </>
          )}
          {result.remainder > 0.001 && (
            <T style={{ color: colors.warning, marginTop: space.sm }}>
              Can't make exactly {fmtNum(target!)} {unit} — {fmtNum(result.remainder)} {unit} short (loaded {fmtNum(target! - result.remainder)}).
            </T>
          )}
        </Card>
      )}

      <Card>
        <H2>Available plates</H2>
        <T faint size={12} style={{ marginBottom: space.sm }}>Tap to leave a plate out of this calculation (e.g. when the gym is out of 45s).</T>
        <ChipRow>
          {sorted.map((p) => (
            <View key={p}>
              <Chip
                label={`${fmtNum(p)}${disabledPlates.includes(p) ? ' ✕' : ''}`}
                selected={!disabledPlates.includes(p)}
                onPress={() => setDisabledPlates((d) => (d.includes(p) ? d.filter((x) => x !== p) : [...d, p]))}
              />
            </View>
          ))}
        </ChipRow>
        <Row style={{ gap: space.sm }}>
          <NumberInput value={newPlate} onChange={setNewPlate} parse={parseNumber} format={String} placeholder="Plate" style={[styles.input, { flex: 1 }]} />
          <Button
            title="Add plate"
            small
            disabled={!newPlate}
            onPress={() => {
              if (newPlate && !plates.includes(newPlate)) setPlates([...plates, newPlate]);
              setNewPlate(null);
            }}
          />
        </Row>
        <ChipRow>
          {sorted.map((p) => (
            <Chip key={`rm${p}`} label={`Remove ${fmtNum(p)}`} onPress={() => setPlates(plates.filter((x) => x !== p))} />
          ))}
        </ChipRow>
      </Card>

      <Card>
        <H2>Bars</H2>
        <T faint size={12} style={{ marginBottom: space.sm }}>Add any bar weight — Smith machine, safety squat bar, trap bar, etc.</T>
        <Row style={{ gap: space.sm, marginBottom: space.sm }}>
          <NumberInput value={newBar} onChange={setNewBar} parse={parseNumber} format={String} placeholder="Bar weight" style={[styles.input, { flex: 1 }]} />
          <Button
            title="Add bar"
            small
            disabled={newBar == null}
            onPress={() => {
              if (newBar != null && !bars.includes(newBar)) setBars([...bars, newBar].sort((a, b) => b - a));
              setNewBar(null);
            }}
          />
        </Row>
        <ChipRow>
          {bars.map((b) => (
            <Chip key={`rmb${b}`} label={`Remove ${b === 0 ? 'no bar' : fmtNum(b)}`} onPress={() => setBars(bars.filter((x) => x !== b))} />
          ))}
        </ChipRow>
      </Card>
    </ScrollView>
  );
}

function summarize(perSide: number[]): string {
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([p, c]) => `${c} × ${fmtNum(p)}`).join(', ');
}
