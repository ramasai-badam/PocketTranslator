import { Stack } from 'expo-router'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { TextSizeProvider } from '@/contexts/TextSizeContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  useFrameworkReady();
  return (
    <ThemeProvider>
      <TextSizeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="linguistic-breakdown" />
        </Stack>
      </TextSizeProvider>
    </ThemeProvider>
  );
}