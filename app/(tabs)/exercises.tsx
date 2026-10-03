import React, { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Chip, Empty, IconButton, Input, ListItem, T, styles } from '@/components/ui';
import { BODY_PARTS } from '@/data/exercises';
import { useExercises } from '@/repo/exercises';
import { space } from '@/theme';

export default function ExercisesScreen() {
  const navigation = useNavigation();
  const list = useExercises((s) => s.list);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <IconButton name="add" onPress={() => router.push('/exercise/edit')} style={{ marginRight: space.md }} />,
    });
  }, [navigation]);

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter(
      (e) =>
        e.hidden === showHidden &&
        (!bodyPart || e.bodyPart === bodyPart) &&
        words.every((w) => e.name.toLowerCase().includes(w) || e.equipment.toLowerCase().includes(w) || e.pattern.toLowerCase().includes(w)),
    );
  }, [list, query, bodyPart, showHidden]);

  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Input placeholder="Search exercises" value={query} onChangeText={setQuery} autoCorrect={false} />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm }}>
          <Chip label={showHidden ? 'Hidden ✓' : 'Hidden'} selected={showHidden} onPress={() => setShowHidden((v) => !v)} />
          <Chip label="All" selected={!bodyPart} onPress={() => setBodyPart(null)} />
          {BODY_PARTS.map((b) => (
            <Chip key={b} label={b} selected={bodyPart === b} onPress={() => setBodyPart(bodyPart === b ? null : b)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Empty text={showHidden ? 'No hidden exercises.' : 'No exercises match.'} />}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.bodyPart} · ${item.pattern} · ${item.equipment}`}
            onPress={() => router.push(`/exercise/${item.id}`)}
            right={item.isCustom ? <T faint size={11}>CUSTOM</T> : undefined}
          />
        )}
      />
    </View>
  );
}
