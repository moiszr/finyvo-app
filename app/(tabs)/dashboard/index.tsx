// app/(tabs)/dashboard/index.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { bottom } = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      // Añadimos espacio en la parte inferior para que el último elemento
      // no quede oculto detrás de la barra de pestañas flotante.
      contentContainerStyle={{ paddingBottom: bottom + 100 }} // 100 es un buen valor (65 de la barra + 30 de margen + extra)
    >
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenido a FINYVO</Text>
        <Text style={styles.subtitle}>Hola {user?.email || 'Usuario'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Financiero</Text>
          <Text style={styles.placeholder}>
            Aquí irá tu dashboard principal con:
            {'\n'}- Balance actual
            {'\n'}- Gastos del mes
            {'\n'}- Metas de ahorro
            {'\n'}- Gráficos de gastos
          </Text>
        </View>

        <Button
          title="Cerrar Sesión"
          onPress={signOut}
          variant="outline"
          style={styles.signOutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 40,
  },
  section: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
  },
  signOutButton: {
    marginTop: 20,
    alignSelf: 'center',
    minWidth: 200,
  },
});
