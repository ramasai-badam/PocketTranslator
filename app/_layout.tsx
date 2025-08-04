import { Stack } from 'expo-router'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { TextSizeProvider } from '@/contexts/TextSizeContext';

export default function RootLayout() {
  useFrameworkReady();
  return (
    <TextSizeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="linguistic-breakdown" />
      </Stack>
    </TextSizeProvider>
  );
}