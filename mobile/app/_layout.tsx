import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Learning Lab' }} />
        <Stack.Screen name="scene" options={{ title: '3D Lab' }} />
        <Stack.Screen name="combat" options={{ title: 'Hitbox Lab' }} />
        <Stack.Screen name="map" options={{ title: 'Map Lab' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
