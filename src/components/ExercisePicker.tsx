import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BODY_PARTS } from '@/data/exercises';
import { createExercise, useExercises } from '@/repo/exercises';
import { Button, Chip, IconButton, Input, T } from '@/components/ui';
import { colors, space } from '@/theme';

export function ExercisePicker({
  visible,
  multi = true,
  title = 'Add exercises',
  excludeIds = [],
  onClose,
  onPick,
}: {
  visible: boolean;
  multi?: boolean;
  title?: string;
  excludeIds?: string[];
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const list = useExercises((s) => s.list);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    return list.filter(
      (e) =>
        !e.hidden &&
        !excludeIds.includes(e.id) &&
        (!bodyPart || e.bodyPart === bodyPart) &&
        words.every((w) => e.name.toLowerCase().includes(w) || e.equipment.toLowerCase().includes(w)),
    );
  }, [list, query, bodyPart, excludeIds]);

  const close = () => {
    setSelected([]);
    setQuery('');
    onClose();
  };

  const finish = (ids: string[]) => {
    setSelected([]);
    setQuery('');
    onPick(ids);
  };

  const toggle = (id: string) => {
    if (!multi) return finish([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const quickCreate = () => {
    const e = createExercise({ name: query.trim(), bodyPart: bodyPart ?? 'Other' });
    toggle(e.id);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, paddingBottom: space.sm }}>
          <IconButton name="close" onPress={close} />
          <T bold size={18} style={{ flex: 1, marginLeft: space.md }}>{title}</T>
          {multi && (
            <Button title={`Add${selected.length ? ` (${selected.length})` : ''}`} small disabled={!selected.length} onPress={() => finish(selected)} />
          )}
        </View>
        <View style={{ paddingHorizontal: space.lg }}>
          <Input placeholder="Search" value={query} onChangeText={setQuery} autoCorrect={false} />
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm }}>
            <Chip label="All" selected={!bodyPart} onPress={() => setBodyPart(null)} />
            {BODY_PARTS.map((b) => (
              <Chip key={b} label={b} selected={bodyPart === b} onPress={() => setBodyPart(bodyPart === b ? null : b)} />
            ))}
          </ScrollView>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          ListHeaderComponent={
            query.trim() && !list.some((e) => e.name.toLowerCase() === query.trim().toLowerCase()) ? (
              <Pressable onPress={quickCreate} style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <T style={{ color: colors.primary, marginLeft: space.sm }}>Create “{query.trim()}”</T>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const sel = selected.includes(item.id);
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: space.md,
                  paddingHorizontal: space.lg,
                  backgroundColor: sel ? colors.primaryDim : 'transparent',
                }}
              >
                <View style={{ flex: 1 }}>
                  <T>{item.name}</T>
                  <T faint size={12}>{item.bodyPart} · {item.equipment}</T>
                </View>
                {sel && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
