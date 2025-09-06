import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Currency = 'USD' | 'EUR' | 'DOP';
type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'es';

export interface SettingsState {
  // Settings
  currency: Currency;
  theme: Theme;
  language: Language;
  notifications: boolean;
  biometrics: boolean;

  // Actions
  setCurrency: (currency: Currency) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setNotifications: (enabled: boolean) => void;
  setBiometrics: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  currency: 'USD' as Currency,
  theme: 'system' as Theme,
  language: 'es' as Language,
  notifications: true,
  biometrics: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotifications: (notifications) => set({ notifications }),
      setBiometrics: (biometrics) => set({ biometrics }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
