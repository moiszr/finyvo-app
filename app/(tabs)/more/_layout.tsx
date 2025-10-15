// app/(tabs)/more/_layout.tsx
import { Stack } from 'expo-router';

export default function MoreStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        title: 'Más',
      }}
    />
  );
}
