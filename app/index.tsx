// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks';

export default function IndexPage() {
  const { isAuthenticated, isOnboarded } = useAuth();

  // Redirección inteligente basada en estado de auth
  if (isAuthenticated) {
    if (isOnboarded) {
      return <Redirect href="/(tabs)/dashboard" />;
    } else {
      // TODO: Crear pantalla de onboarding
      return <Redirect href="/(tabs)/dashboard" />;
    }
  }

  return <Redirect href="/(auth)/sign-in" />;
}
