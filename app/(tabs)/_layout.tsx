// app/(tabs)/_layout.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { Platform, DynamicColorIOS } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';

// ✨ 1. Definimos colores para los estados activo e inactivo
const ACTIVE_COLOR = '#007AFF'; // Un azul vibrante estándar de iOS
const INACTIVE_COLOR = '#8E8E93'; // Un gris estándar de iOS para texto secundario

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  
  // ✨ 2. Hacemos los colores dinámicos para iOS (modo claro/oscuro)
  const activeColorIOS = DynamicColorIOS({ dark: ACTIVE_COLOR, light: ACTIVE_COLOR });
  const inactiveColorIOS = DynamicColorIOS({ dark: INACTIVE_COLOR, light: INACTIVE_COLOR });
  
  // ✨ 3. Actualizamos los estilos para usar nuestros nuevos colores
  const labelStyle = {
    fontSize: 10.5, // Un poco más grande para mejor legibilidad sin ser gigante
    fontWeight: '500' as const,
    color: Platform.OS === 'ios' ? inactiveColorIOS : INACTIVE_COLOR,
  };

  const selectedLabelStyle = {
    fontWeight: '600' as const,
    color: Platform.OS === 'ios' ? activeColorIOS : ACTIVE_COLOR,
  };

  return (
    <NativeTabs
      blurEffect={Platform.OS === 'ios' ? 'systemMaterial' : undefined}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
      labelStyle={labelStyle}
      shadowColor="rgba(11,36,71,0.08)"
    >
      {/* Inicio */}
      <NativeTabs.Trigger name="dashboard">
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          // Ionicons outline = más fino
          android: <Icon src={<VectorIcon family={Ionicons} name="home-outline" />} />,
          default: <Icon src={<VectorIcon family={Ionicons} name="home-outline" />} />,
        })}
        <Label selectedStyle={selectedLabelStyle}>Inicio</Label>
      </NativeTabs.Trigger>

      {/* Transacciones */}
      <NativeTabs.Trigger name="transactions">
        {Platform.select({
          // SF Symbols: outline -> fill al seleccionar (más delicado)
          ios: <Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} />,
          // Alternativas finas: 'document-text-outline' o 'reader-outline'
          android: <Icon src={<VectorIcon family={Ionicons} name="document-text-outline" />} />,
          default: <Icon src={<VectorIcon family={Ionicons} name="document-text-outline" />} />,
        })}
        <Label selectedStyle={selectedLabelStyle}>Transacciones</Label>
      </NativeTabs.Trigger>

      {/* Presupuestos */}
      <NativeTabs.Trigger name="budgets">
        {Platform.select({
          ios: <Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="pie-chart-outline" />} />,
          default: <Icon src={<VectorIcon family={Ionicons} name="pie-chart-outline" />} />,
        })}
        <Label selectedStyle={selectedLabelStyle}>Presupuestos</Label>
      </NativeTabs.Trigger>

      {/* Más (grid de 2x2 cajitas) */}
      <NativeTabs.Trigger name="more">
        {Platform.select({
          ios: <Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="apps-outline" />} />,
          default: <Icon src={<VectorIcon family={Ionicons} name="apps-outline" />} />,
        })}
        <Label selectedStyle={selectedLabelStyle}>Más</Label>
      </NativeTabs.Trigger>

      {/*
      Futuro (iOS 26): tab de búsqueda nativa y separada
      <NativeTabs.Trigger name="search" role="search">
        <Label>Buscar</Label>
      </NativeTabs.Trigger>

      O, si prefieres, añade headerSearchBarOptions en cada Stack
      para que la búsqueda sea “reactiva” según la vista.
      */}
    </NativeTabs>
  );
}
