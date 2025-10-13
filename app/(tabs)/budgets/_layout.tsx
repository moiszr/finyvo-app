// app/(tabs)/budgets/_layout.tsx
import { Stack } from 'expo-router';

export default function BudgetsStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        title: 'Presupuestos',
      }}
    />
  );
}
