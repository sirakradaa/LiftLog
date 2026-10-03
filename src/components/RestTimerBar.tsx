import React, { useEffect, useRef } from 'react';
import { Pressable, Vibration, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { fmtDuration } from '@/lib/units';
import { adjustRest, skipRest, useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme';

export function RestTimerBar() {
  const insets = useSafeAreaInsets();
  const restEndsAt = useActiveWorkout((s) => s.active?.restEndsAt ?? null);
  const restTotal = useActiveWorkout((s) => s.active?.restTotal ?? 0);
  const vibrate = useSettings((s) => s.restTimerVibrate);
  const now = useNow(250, !!restEndsAt);
  const firedFor = useRef<number | null>(null);

  const remaining = restEndsAt ? Math.max(0, (restEndsAt - now) / 1000) : 0;

  useEffect(() => {
    if (restEndsAt && remaining <= 0 && firedFor.current !== restEndsAt) {
      firedFor.current = restEndsAt;
      if (vibrate) Vibration.vibrate([0, 400, 200, 400]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      skipRest();
    }
  }, [remaining, restEndsAt, vibrate]);

  if (!restEndsAt) return null;
  const pct = restTotal > 0 ? Math.min(1, remaining / restTotal) : 0;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + space.sm,
        paddingTop: space.sm,
        paddingHorizontal: space.lg,
      }}
    >
      <View style={{ height: 4, backgroundColor: colors.cardAlt, borderRadius: 2, marginBottom: space.sm }}>
        <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TimerBtn label="−15" onPress={() => adjustRest(-15)} />
        <View style={{ alignItems: 'center' }}>
          <T faint size={11}>REST</T>
          <T bold size={26}>{fmtDuration(remaining)}</T>
        </View>
        <TimerBtn label="+15" onPress={() => adjustRest(15)} />
        <TimerBtn label="Skip" onPress={skipRest} primary />
      </View>
    </View>
  );
}

function TimerBtn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: primary ? colors.primary : colors.cardAlt,
        borderRadius: radius.md,
        paddingVertical: 10,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <T bold>{label}</T>
    </Pressable>
  );
}
