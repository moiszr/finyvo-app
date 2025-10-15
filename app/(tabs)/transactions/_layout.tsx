import { Stack } from 'expo-router';

export default function TransactionsStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        title: 'Transacciones',
      }}
    />
  );
}
