import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SafeTranslatorScreen() {
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = () => {
    // TODO: Implement recording with native modules
    setIsRecording(!isRecording);
    console.log('Recording button pressed');
  };

  const handleTranslate = () => {
    // TODO: Implement translation with native modules
    console.log('Translate button pressed');
    setTranslatedText('Translation will be implemented here');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PocketTranslator</Text>
      </View>

      {/* Language Selection */}
      <View style={styles.languageContainer}>
        <TouchableOpacity style={styles.languageButton}>
          <Text style={styles.languageText}>{sourceLanguage}</Text>
        </TouchableOpacity>
        <Text style={styles.arrowText}>→</Text>
        <TouchableOpacity style={styles.languageButton}>
          <Text style={styles.languageText}>{targetLanguage}</Text>
        </TouchableOpacity>
      </View>

      {/* Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Speak or Type</Text>
        <View style={styles.textContainer}>
          <Text style={styles.inputText}>
            {sourceText || 'Tap the microphone to start recording...'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={handleRecord}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '⏹️ Stop' : '🎤 Record'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Translation Section */}
      <View style={styles.translationSection}>
        <Text style={styles.sectionTitle}>Translation</Text>
        <View style={styles.textContainer}>
          <Text style={styles.translatedText}>
            {translatedText || 'Translation will appear here...'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.translateButton} onPress={handleTranslate}>
          <Text style={styles.translateButtonText}>Translate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  languageButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  languageText: {
    color: '#fff',
    fontSize: 16,
  },
  arrowText: {
    color: '#fff',
    fontSize: 20,
  },
  inputSection: {
    flex: 1,
    marginBottom: 20,
  },
  translationSection: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textContainer: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    marginBottom: 15,
  },
  inputText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  translatedText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  recordButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
  },
  recordingButton: {
    backgroundColor: '#c0392b',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  translateButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
  },
  translateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
