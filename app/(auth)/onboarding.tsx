// app/(auth)/onboarding.tsx
import { View, Text } from 'react-native';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';

export default function Onboarding() {
  const { setOnboarded } = useAuthStore();
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>
        Bienvenido a FINYVO
      </Text>
      <Button
        title="Terminar"
        onPress={() => {
          setOnboarded(true); // ✅
          router.replace('/(tabs)/dashboard');
        }}
      />
    </View>
  );
}
