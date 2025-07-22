import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';

// This is a tab wrapper that redirects to the main history screen
export default function HistoryTab() {
  useFocusEffect(
    React.useCallback(() => {
      // Redirect to the main history screen when tab is focused
      router.push('/history');
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.text}>Loading history...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 16,
  },
});