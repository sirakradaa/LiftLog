import React from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { Button, Card, Chip, ChipRow, H2, Row, T, styles } from '@/components/ui';
import { exportBackup, exportCSV, importBackup, importStrongCSV } from '@/lib/backup';
import { fmtDuration } from '@/lib/units';
import { updateSettings, useSettings } from '@/store/settings';
import { colors, space } from '@/theme';

const REST = [30, 45, 60, 90, 120, 150, 180, 240, 300];

async function run(label: string, fn: () => Promise<string | null>) {
  try {
    const msg = await fn();
    if (msg) Alert.alert(label, msg);
  } catch (e) {
    Alert.alert(`${label} failed`, e instanceof Error ? e.message : String(e));
  }
}

export default function SettingsScreen() {
  const s = useSettings();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <H2>Units</H2>
        <ChipRow>
          <Chip label="Pounds (lb, mi, in)" selected={s.unit === 'lb'} onPress={() => updateSettings({ unit: 'lb' })} />
          <Chip label="Kilograms (kg, km, cm)" selected={s.unit === 'kg'} onPress={() => updateSettings({ unit: 'kg' })} />
        </ChipRow>
        <T faint size={12}>Data is stored in metric internally, so switching units converts everything — nothing is lost.</T>
      </Card>

      <Card>
        <H2>Rest timer</H2>
        <T dim size={13} style={{ marginBottom: space.sm }}>Default rest after completing a set</T>
        <ChipRow>
          {REST.map((r) => (
            <Chip key={r} label={fmtDuration(r)} selected={s.defaultRestSeconds === r} onPress={() => updateSettings({ defaultRestSeconds: r })} />
          ))}
        </ChipRow>
        <Toggle label="Notification when rest ends (works with screen off)" value={s.restTimerNotification} onChange={(v) => updateSettings({ restTimerNotification: v })} />
        <Toggle label="Vibrate when rest ends (app open)" value={s.restTimerVibrate} onChange={(v) => updateSettings({ restTimerVibrate: v })} />
        <Toggle label="Keep screen on during workouts" value={s.keepScreenAwake} onChange={(v) => updateSettings({ keepScreenAwake: v })} />
      </Card>

      <Card>
        <H2>Your data</H2>
        <T faint size={12} style={{ marginBottom: space.md }}>
          Everything is stored on this phone. Make regular backups — a full backup can be restored on any device running LiftLog.
        </T>
        <View style={{ gap: space.sm }}>
          <Button title="Back up (JSON)" icon="cloud-upload-outline" onPress={() => run('Backup', async () => { await exportBackup(); return null; })} />
          <Button
            title="Restore from backup"
            icon="cloud-download-outline"
            variant="secondary"
            onPress={() =>
              Alert.alert('Restore backup?', 'Entries in the backup are merged into this device, overwriting matching items.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Choose file',
                  onPress: () =>
                    run('Restore', async () => {
                      const n = await importBackup();
                      return n == null ? null : `Restored ${n} workouts.`;
                    }),
                },
              ])
            }
          />
          <Button title="Export CSV (Strong format)" icon="document-text-outline" variant="secondary" onPress={() => run('Export', async () => { await exportCSV(); return null; })} />
          <Button
            title="Import from Strong CSV"
            icon="swap-horizontal"
            variant="secondary"
            onPress={() =>
              Alert.alert(
                'Import from Strong',
                `In Strong: Settings → Export Strong Data, then pick that CSV here. Weights without a unit column are read as ${s.unit}. Workouts already imported are skipped.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Choose file',
                    onPress: () =>
                      run('Import', async () => {
                        const r = await importStrongCSV(s.unit);
                        return r ? `Imported ${r.workouts} workouts (${r.skipped} skipped as duplicates). Created ${r.newExercises} new exercises.` : null;
                      }),
                  },
                ],
              )
            }
          />
        </View>
      </Card>
      <T faint size={12} style={{ textAlign: 'center', marginTop: space.md }}>LiftLog 0.1.0</T>
    </ScrollView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: space.sm }}>
      <T style={{ flex: 1, marginRight: space.md }}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
    </Row>
  );
}
