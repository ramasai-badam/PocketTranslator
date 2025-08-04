import React, { useState } from 'react';
import { View, Text } from 'react-native';
import WelcomeScreen from './WelcomeScreen';
import { withNativeModuleSafety } from '../components/NativeModuleSafety';

// Dynamically import the main translator screen only when needed
let MainTranslatorScreen: React.ComponentType | null = null;
let SafeMainTranslatorScreen: React.ComponentType | null = null;

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  
  console.log('Index rendering, ready:', ready);
  
  const handleReady = async () => {
    console.log('WelcomeScreen called onReady');
    setLoading(true);
    
    try {
      // Import the main translator screen only when models are ready
      if (!MainTranslatorScreen) {
        const module = await import('./SingleTranslatorScreen');
        MainTranslatorScreen = module.default;
        // Wrap with safety boundary
        SafeMainTranslatorScreen = withNativeModuleSafety(
          MainTranslatorScreen, 
          'Speech-to-text translation requires device native modules'
        );
      }
      setReady(true);
    } catch (error) {
      console.error('Error loading main translator screen:', error);
      // Even if there's an error, show a safe fallback
      SafeMainTranslatorScreen = () => (
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
  
  if (ready && SafeMainTranslatorScreen) {
    return <SafeMainTranslatorScreen />;
  }
  
  return <WelcomeScreen onReady={handleReady} />;
}
