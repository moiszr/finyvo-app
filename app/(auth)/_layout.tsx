// app/(auth)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Iniciar Sesión',
          animation: 'slide_from_left',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="sign-up" options={{ title: 'Crear Cuenta' }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: 'Recuperar Contraseña' }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Nueva Contraseña',
          gestureEnabled: false, // evita volver atrás con gesto
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{ title: 'Verifica tu correo', gestureEnabled: false }}
      />
      <Stack.Screen
        name="email-verified"
        options={{ title: 'Correo Verificado', gestureEnabled: false }}
      />
    </Stack>
  );
}
