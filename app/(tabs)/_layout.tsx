import { Tabs } from 'expo-router';
import { Mic } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tab bar for full screen experience
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Translator',
          tabBarIcon: ({ size, color }) => (
            <Mic size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}