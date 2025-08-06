import React, { useState } from 'react';
import { View, Text } from 'react-native';
import WelcomeScreen from './WelcomeScreen';
import { withNativeModuleSafety } from '../components/NativeModuleSafety';

// Dynamically import TranslatorScreen only when needed
let TranslatorScreen: React.ComponentType | null = null;
let SafeTranslatorScreen: React.ComponentType | null = null;

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  
  console.log('Index rendering, ready:', ready);
  
  const handleReady = async () => {
    console.log('WelcomeScreen called onReady');
    setLoading(true);
    
    try {
      // Import the TranslatorScreen only when models are ready
      if (!TranslatorScreen) {
        const module = await import('./(tabs)/index');
        TranslatorScreen = module.default;
        // Wrap with safety boundary
        SafeTranslatorScreen = withNativeModuleSafety(
          TranslatorScreen, 
          'Speech-to-text translation requires device native modules'
        );
      }
      setReady(true);
    } catch (error) {
      console.error('Error loading TranslatorScreen:', error);
      // Even if there's an error, show a safe fallback
      SafeTranslatorScreen = () => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
          <Text style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>
            Translation interface unavailable
          </Text>
          <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
            Error loading translation components
          </Text>
        </View>
      );
      setReady(true);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: 'white' }}>Loading translator...</Text>
      </View>
    );
  }
  
  if (ready && SafeTranslatorScreen) {
    return <SafeTranslatorScreen />;
  }
  
  return <WelcomeScreen onReady={handleReady} />;
}
