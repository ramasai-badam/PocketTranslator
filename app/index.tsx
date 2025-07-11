import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Mic, Download } from 'lucide-react-native';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTranslation } from '@/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  
  const { whisperReady, error: whisperError } = useSpeechToText();
  const { llamaReady, error: llamaError } = useTranslation();

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    const updateProgress = () => {
      if (!whisperReady && !llamaReady) {
        setLoadingStatus('Downloading AI models...');
        setProgress(prev => Math.min(prev + 2, 40));
      } else if (whisperReady && !llamaReady) {
        setLoadingStatus('Loading translation model...');
        setProgress(prev => Math.min(prev + 3, 80));
      } else if (!whisperReady && llamaReady) {
        setLoadingStatus('Loading speech recognition...');
        setProgress(prev => Math.min(prev + 3, 80));
      } else if (whisperReady && llamaReady) {
        setLoadingStatus('Ready!');
        setProgress(100);
        
        // Navigate to main app after a brief delay
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
      }
    };

    // Check for errors
    if (whisperError || llamaError) {
      setLoadingStatus(`Error: ${whisperError || llamaError}`);
      setProgress(0);
      return;
    }

    // Update progress every 500ms
    progressInterval = setInterval(updateProgress, 500);
    updateProgress(); // Initial call

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [whisperReady, llamaReady, whisperError, llamaError]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mic size={80} color="#3b82f6" />
        </View>
        
        <Text style={styles.title}>Speech Translator</Text>
        <Text style={styles.subtitle}>
          Real-time speech translation with local AI
        </Text>
        
        <View style={styles.loadingContainer}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          
          <View style={styles.statusContainer}>
            <Download size={20} color="#6b7280" />
            <Text style={styles.statusText}>{loadingStatus}</Text>
          </View>
          
          {progress < 100 && (
            <ActivityIndicator 
              size="large" 
              color="#3b82f6" 
              style={styles.spinner}
            />
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • Whisper AI for speech recognition
          </Text>
          <Text style={styles.infoText}>
            • Local translation models
          </Text>
          <Text style={styles.infoText}>
            • Works offline after download
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 8,
    fontWeight: '500',
  },
  spinner: {
    marginTop: 8,
  },
  infoContainer: {
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'left',
  },
});