// src/themes/colors.ts

/**
 * Paleta central + aliases (compatibilidad)
 * Mantén nombres estables para evitar tocar componentes.
 */
export const colors = {
  // Superficie
  surface: '#FFFFFF', // fondo principal (app)
  surfaceMuted: '#F6F7FB', // bloques suaves/cards/fondos sutiles
  surfaceAlt: '#F6F7FB', // alias → mismo valor que surfaceMuted

  // Bordes / separators
  border: '#E5E7EB',

  // Texto
  textPrimary: '#0F172A', // título
  textSecondary: '#64748B', // cuerpo/subtítulo
  textHint: '#94A3B8', // hints/ayudas
  textMuted: '#6B7280', // alias para tonos grises de estado
  muted: '#6B7280', // alias (compat)

  // Marca
  brand: {
    navy: '#0B2447',
    navyBg: '#E9EEF6', // fondos suaves para iconos redondos
  },

  // Estado: error
  error: {
    fg: '#B91C1C', // texto/icono error
    bg: '#FEE2E2', // fondo para cajas de error
    text: '#B91C1C', // alias → mismo que fg
  },

  // Estado: éxito
  success: {
    fg: '#16A34A',
    bg: '#DCFCE7',
  },

  // Crudos (utilidades puntuales)
  raw: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
} as const;

export type Colors = typeof colors;
