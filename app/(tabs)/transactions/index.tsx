import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth, useUser } from '@/hooks';
import { Button } from '@/components/ui/Button';

export default function TransactionsScreen() {
  const { signOut } = useAuth();
  const user = useUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a FINYVO!</Text>
      <Text style={styles.subtitle}>Hola {user?.fullName || 'Usuario'} 👋</Text>

      <View style={styles.content}>
        <Text style={styles.description}>
          Tu pantalla de transacciones estará aquí. Por ahora, puedes probar
          cerrar sesión.
        </Text>

        <Button
          title="Cerrar Sesión"
          onPress={signOut}
          variant="outline"
          style={styles.signOutButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  signOutButton: {
    minWidth: 200,
  },
});
