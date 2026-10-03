import '@/db';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initNotifications } from '@/lib/notifications';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    void initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="active" options={{ title: 'Workout', presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Template' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
        <Stack.Screen name="exercise/edit" options={{ title: 'Edit exercise' }} />
        <Stack.Screen name="measure/[kind]" options={{ title: 'Measurement' }} />
        <Stack.Screen name="tools/plates" options={{ title: 'Plate calculator' }} />
        <Stack.Screen name="tools/warmup" options={{ title: 'Warm-up calculator' }} />
        <Stack.Screen name="tools/onerm" options={{ title: '1RM calculator' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
