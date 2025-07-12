import React, { useState } from 'react';
import TranslatorScreen from './(tabs)/index';
import WelcomeScreen from './WelcomeScreen';

export default function AppEntry() {
  const [ready, setReady] = useState(false);

  return ready ? (
    <TranslatorScreen />
  ) : (
    <WelcomeScreen onReady={() => setReady(true)} />
  );
}
