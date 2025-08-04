import { Stack } from 'expo-router'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="two-sided-translator" />
      <Stack.Screen name="linguistic-breakdown" />
    </Stack>
  );
}