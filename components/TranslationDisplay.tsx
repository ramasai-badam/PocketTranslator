import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface TranslationDisplayProps {
  text: string;
  isRotated?: boolean;
}

export default function TranslationDisplay({
  text,
  isRotated = false,
}: TranslationDisplayProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.text, isRotated && styles.rotatedText]}>
          {text || 'Tap and hold the microphone to start speaking...'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 10,
    marginVertical: 20,
    minHeight: 120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  rotatedText: {
    // Text is already rotated by parent container
  },
});