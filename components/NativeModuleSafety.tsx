import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';

// Error boundary component for native module crashes
class NativeModuleErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('Native module error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Native module crash details:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Safe wrapper for components that use native modules
export function withNativeModuleSafety<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage: string = 'Native module unavailable'
) {
  return function SafeComponent(props: P) {
    const [hasNativeSupport, setHasNativeSupport] = useState(true);

    const fallback = (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
          {fallbackMessage}
        </Text>
        <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
          This feature requires native modules that are not available in the current environment.
          Please run on a physical device for full functionality.
        </Text>
      </View>
    );

    if (!hasNativeSupport) {
      return fallback;
    }

    return (
      <NativeModuleErrorBoundary 
        fallback={fallback}
      >
        <Component {...props} />
      </NativeModuleErrorBoundary>
    );
  };
}

export default NativeModuleErrorBoundary;
