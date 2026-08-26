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
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import { useEffect } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

import { AuthProvider } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Archivo_400Regular,
    Archivo_500Medium,
  });

  // Android brings the system bars back whenever the keyboard opens or closes.
  useEffect(() => {
    if (Platform.OS !== 'android' || !landscape) {
      return;
    }
    const hide = () => {
      NavigationBar.setHidden(true);
      setStatusBarHidden(true);
    };
    const subs = (['keyboardDidShow', 'keyboardDidHide'] as const).map((event) =>
      Keyboard.addListener(event, hide)
    );
    return () => subs.forEach((sub) => sub.remove());
  }, [landscape]);

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
      <StatusBar hidden={landscape} />
      <NavigationBar hidden={landscape} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </AuthProvider>
  );
}
