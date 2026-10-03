import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import { Button, Chip, ChipRow, Input, T, styles } from '@/components/ui';
import { getTemplate, listFolders, saveTemplate } from '@/repo/templates';
import { space } from '@/theme';
import type { Template } from '@/types';

export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const [t, setT] = useState<Template | null>(() =>
    isNew ? { id: '', name: 'New Template', folder: '', notes: '', exercises: [], lastUsedAt: null } : getTemplate(id),
  );
  const [folders] = useState(listFolders);

  if (!t) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <T dim>Template not found.</T>
      </View>
    );
  }

  const save = () => {
    saveTemplate({ ...t, id: isNew ? null : t.id });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: isNew ? 'New template' : 'Edit template', headerRight: () => <Button title="Save" small onPress={save} /> }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Name" value={t.name} onChangeText={(name) => setT({ ...t, name })} selectTextOnFocus={isNew} />
        <Input label="Folder (optional)" value={t.folder} onChangeText={(folder) => setT({ ...t, folder })} placeholder="e.g. Home gym, PPL, Program A" />
        {folders.length > 0 && (
          <ChipRow>
            {folders.map((f) => (
              <Chip key={f} label={f} selected={t.folder === f} onPress={() => setT({ ...t, folder: t.folder === f ? '' : f })} />
            ))}
          </ChipRow>
        )}
        <Input label="Notes" value={t.notes} onChangeText={(notes) => setT({ ...t, notes })} multiline />
        <T dim size={13} style={{ marginBottom: space.sm }}>
          Set target weights and reps for each set; they pre-fill when you start the workout.
        </T>
        <WorkoutEditor draft={t} onChange={(d) => setT({ ...t, ...d })} mode="template" />
      </ScrollView>
    </View>
  );
}
