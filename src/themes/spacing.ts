// src/themes/spacing.ts

// Escala 8pt + utilidades
export const spacing = {
  // escala base
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,

  // alias semánticos
  gutter: 24, // padding horizontal de pantallas
  formGap: 12,
  sectionGap: 20,
} as const;

// (Opcional) helper si quieres multiplicar la escala: s(2) => 16
export const s = (multiplier = 1) => 8 * multiplier;
