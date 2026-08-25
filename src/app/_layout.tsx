import {
  Archivo_400Regular,
  Archivo_500Medium,
} from '@expo-google-fonts/archivo';
import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_800ExtraBold,
} from '@expo-google-fonts/big-shoulders-display';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Archivo_400Regular,
    Archivo_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </AuthProvider>
  );
}
