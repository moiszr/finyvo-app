import { Stack } from 'expo-router';

export default function GoalsStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        title: 'Metas',
      }}
    />
  );
}
