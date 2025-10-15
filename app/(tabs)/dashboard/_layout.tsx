// app/(tabs)/dashboard/_layout.tsx
import { Stack } from 'expo-router';

export default function DashboardStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        title: 'Inicio',
      }}
    />
  );
}
