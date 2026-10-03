import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ActionMenu, type MenuSpec } from '@/components/ActionMenu';
import { Button, Card, Empty, H2, Row, T, styles } from '@/components/ui';
import { useFocusData } from '@/lib/hooks';
import { beginWorkout } from '@/lib/start';
import { fmtDate } from '@/lib/units';
import { exerciseName } from '@/repo/exercises';
import { deleteTemplate, listTemplates, markTemplateUsed, saveTemplate } from '@/repo/templates';
import { copyExercises } from '@/repo/workouts';
import { useActiveWorkout } from '@/store/activeWorkout';
import { space } from '@/theme';
import type { Template } from '@/types';

export default function StartWorkoutScreen() {
  const [templates, reload] = useFocusData(listTemplates);
  const active = useActiveWorkout((s) => s.active);
  const [menu, setMenu] = useState<MenuSpec | null>(null);

  const folders = new Map<string, Template[]>();
  for (const t of templates) {
    const key = t.folder || 'My Templates';
    folders.set(key, [...(folders.get(key) ?? []), t]);
  }

  const start = (t: Template) => {
    markTemplateUsed(t.id);
    beginWorkout({ name: t.name, notes: t.notes, templateId: t.id, exercises: copyExercises(t.exercises) });
  };

  const openMenu = (t: Template) =>
    setMenu({
      title: t.name,
      items: [
        { label: 'Start workout', icon: 'play', onPress: () => start(t) },
        { label: 'Edit template', icon: 'create-outline', onPress: () => router.push(`/template/${t.id}`) },
        {
          label: 'Duplicate',
          icon: 'copy-outline',
          onPress: () => {
            saveTemplate({ name: `${t.name} (copy)`, folder: t.folder, notes: t.notes, exercises: copyExercises(t.exercises) });
            reload();
          },
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            Alert.alert('Delete template?', t.name, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteTemplate(t.id);
                  reload();
                },
              },
            ]),
        },
      ],
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {active ? (
        <Button title={`Resume: ${active.name}`} icon="play" onPress={() => router.push('/active')} style={{ marginBottom: space.md }} />
      ) : null}
      <H2>Quick start</H2>
      <Button title="Start an empty workout" variant={active ? 'secondary' : 'primary'} onPress={() => beginWorkout()} style={{ marginBottom: space.xl }} />

      <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
        <H2 style={{ marginBottom: 0 }}>Templates</H2>
        <Button title="Template" icon="add" small variant="secondary" onPress={() => router.push('/template/new')} />
      </Row>
      {templates.length === 0 && <Empty text="No templates yet. Create one, or save a finished workout as a template." />}
      {[...folders.entries()].map(([folder, list]) => (
        <View key={folder} style={{ marginBottom: space.md }}>
          <T dim bold size={13} style={{ marginBottom: space.sm }}>{folder.toUpperCase()} ({list.length})</T>
          {list.map((t) => (
            <Card key={t.id} onPress={() => openMenu(t)}>
              <T bold size={16} style={{ marginBottom: 4 }}>{t.name}</T>
              {t.exercises.slice(0, 6).map((e) => (
                <T key={e.id} dim size={13} numberOfLines={1}>
                  {e.sets.length} × {exerciseName(e.exerciseId)}
                </T>
              ))}
              {t.exercises.length > 6 && <T faint size={12}>+{t.exercises.length - 6} more</T>}
              {t.lastUsedAt ? <T faint size={11} style={{ marginTop: 6 }}>Last used {fmtDate(t.lastUsedAt)}</T> : null}
            </Card>
          ))}
        </View>
      ))}
      <ActionMenu spec={menu} onClose={() => setMenu(null)} />
    </ScrollView>
  );
}
