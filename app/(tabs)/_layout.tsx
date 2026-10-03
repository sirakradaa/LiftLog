import React from 'react';
import { ColorValue, Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { fmtDuration } from '@/lib/units';
import { elapsedMs, useActiveWorkout } from '@/store/activeWorkout';
import { colors, radius, space } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color} size={size} />,
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800', fontSize: 22 },
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textFaint,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={tab('Profile', 'person-circle-outline')} />
        <Tabs.Screen name="history" options={tab('History', 'time-outline')} />
        <Tabs.Screen name="workout" options={tab('Workout', 'add-circle')} />
        <Tabs.Screen name="exercises" options={tab('Exercises', 'barbell-outline')} />
        <Tabs.Screen name="measure" options={tab('Measure', 'body-outline')} />
      </Tabs>
      <ActiveBanner bottom={insets.bottom + 56} />
    </View>
  );
}

function ActiveBanner({ bottom }: { bottom: number }) {
  const active = useActiveWorkout((s) => s.active);
  const now = useNow(1000, !!active);
  if (!active) return null;
  return (
    <Pressable
      onPress={() => router.push('/active')}
      style={{
        position: 'absolute',
        left: space.md,
        right: space.md,
        bottom: bottom + space.sm,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        padding: space.md,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Ionicons name={active.pausedAt ? 'pause' : 'barbell'} size={20} color="#fff" />
      <View style={{ flex: 1, marginLeft: space.md }}>
        <T bold numberOfLines={1}>{active.name}</T>
        <T size={12} style={{ color: '#dbeafe' }}>
          {fmtDuration(elapsedMs(active, now) / 1000)}
          {active.restEndsAt ? `  ·  Rest ${fmtDuration(Math.max(0, (active.restEndsAt - now) / 1000))}` : ''}
        </T>
      </View>
      <T bold>Resume</T>
    </Pressable>
  );
}
