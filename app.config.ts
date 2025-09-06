// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Finyvo',
  slug: 'finyvo',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'finyvo', // deep links: finyvo://...
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    bundleIdentifier: 'com.finyvo.app',
    supportsTablet: true,
  },

  android: {
    package: 'com.finyvo.app',
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    // (Opcional) asegura apertura por esquema en Android
    intentFilters: [
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [{ scheme: 'finyvo' }],
      },
    ],
  },

  web: {},

  assetBundlePatterns: ['**/*'],

  plugins: [
    'expo-router',
    'expo-apple-authentication', // 👈 Sign in with Apple (nativo)
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        image: './src/assets/Splash.jpg', // Asegúrate de que existe
        resizeMode: 'contain', // 'contain' o 'cover'
        backgroundColor: '#FFFFFF',
        dark: {
          image: './src/assets/Splash_dark.jpg', // Opcional (si existe)
          backgroundColor: '#000000',
        },
      },
    ],
  ],
});
