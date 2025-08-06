import React, { useState, useEffect } from 'react'; 
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'; 
import * as FileSystem from 'expo-file-system';
import { MODEL_CONFIG, getModelPath, getModelUrl, getModelSize, getModelDisplayName } from '@/utils/ModelConfig';
import { ModelManager } from '@/utils/ModelManager';
import { useTheme } from '../contexts/ThemeContext';
import { useTextSize } from '../hooks/useTextSize';

interface ModelDownloadProgress {
  whisper: { progress: number; downloaded: boolean; error?: string };
  llama: { progress: number; downloaded: boolean; error?: string };
}

export default function WelcomeScreen({ onReady }: { onReady: () => void }) { 
  const { colors } = useTheme();
  const { getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  
  // Create scaled font sizes based on current text size context
  const fonts = {
    small: Math.max(8, textSizeConfig.fontSize - 4),
    secondary: Math.max(10, textSizeConfig.fontSize - 2),
    primary: textSizeConfig.fontSize,
    emphasized: textSizeConfig.fontSize + 2,
    large: textSizeConfig.fontSize + 4,
    xlarge: textSizeConfig.fontSize + 8,
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [progress, setProgress] = useState<ModelDownloadProgress>({
    whisper: { progress: 0, downloaded: false },
    llama: { progress: 0, downloaded: false }
  });
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    console.log('WelcomeScreen: Component mounted, checking existing models...');
    checkExistingModels();
    // Show skip button after 3 seconds for testing
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const checkExistingModels = async () => {
    try {
      console.log('WelcomeScreen: Starting model validation check...');
      
      const whisperPath = getModelPath('whisper');
      const llamaPath = getModelPath('llama');
      
      console.log('WelcomeScreen: Model paths:', { whisperPath, llamaPath });
      
      const whisperExists = await FileSystem.getInfoAsync(whisperPath);
      const llamaExists = await FileSystem.getInfoAsync(llamaPath);

      // Validate file sizes to ensure complete downloads
      const whisperExpectedSize = getModelSize('whisper');
      const llamaExpectedSize = getModelSize('llama');
      
      console.log('WelcomeScreen: Expected sizes:', { 
        whisper: whisperExpectedSize, 
        llama: llamaExpectedSize 
      });
      
      console.log('WelcomeScreen: File info results:', {
        whisper: {
          exists: whisperExists.exists,
          hasSize: 'size' in whisperExists,
          size: 'size' in whisperExists ? whisperExists.size : 'no size property',
          uri: whisperExists.uri
        },
        llama: {
          exists: llamaExists.exists,
          hasSize: 'size' in llamaExists,
          size: 'size' in llamaExists ? llamaExists.size : 'no size property',
          uri: llamaExists.uri
        }
      });
      
      // More strict validation - ALL conditions must be true
      const whisperValid = whisperExists.exists && 
        'size' in whisperExists && 
        typeof whisperExists.size === 'number' &&
        whisperExists.size > 0 &&
        whisperExists.size >= whisperExpectedSize * 0.99; // Allow 1% tolerance
      
      const llamaValid = llamaExists.exists && 
        'size' in llamaExists && 
        typeof llamaExists.size === 'number' &&
        llamaExists.size > 0 &&
        llamaExists.size >= llamaExpectedSize * 0.99; // Allow 1% tolerance

      console.log('WelcomeScreen: Model validation results:', {
        whisper: { 
          exists: whisperExists.exists, 
          size: 'size' in whisperExists ? whisperExists.size : 'no size', 
          expected: whisperExpectedSize, 
          valid: whisperValid,
          sizeCheck: whisperExists.exists && 'size' in whisperExists ? 
            (whisperExists.size >= whisperExpectedSize * 0.99) : false
        },
        llama: { 
          exists: llamaExists.exists, 
          size: 'size' in llamaExists ? llamaExists.size : 'no size', 
          expected: llamaExpectedSize, 
          valid: llamaValid,
          sizeCheck: llamaExists.exists && 'size' in llamaExists ? 
            (llamaExists.size >= llamaExpectedSize * 0.99) : false
        }
      });

      setProgress(prev => ({
        whisper: { 
          ...prev.whisper, 
          downloaded: Boolean(whisperValid), 
          progress: whisperValid ? 100 : 0 
        },
        llama: { 
          ...prev.llama, 
          downloaded: Boolean(llamaValid), 
          progress: llamaValid ? 100 : 0 
        }
      }));

      // Only proceed if both models exist AND are valid (correct size)
      if (whisperValid && llamaValid) {
        console.log('WelcomeScreen: Both models exist and are valid, loading into memory...');
        await loadModelsIntoMemory();
        setTimeout(() => onReady(), 1000);
      } else {
        console.log('WelcomeScreen: Models invalid or missing, staying on download screen');
      }
    } catch (error) {
      console.error('WelcomeScreen: Error checking existing models:', error);
      // On error, don't auto-proceed - stay on download screen
    }
  };

  const loadModelsIntoMemory = async () => {
    setIsLoadingModels(true);
    try {
      console.log('Loading models into memory...');
      
      // Load both models using ModelManager
      await ModelManager.initializeAll();
      // console.log('Models loaded into memory successfully - skipped');
    } catch (error) {
      console.error('Error loading models into memory:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const downloadModel = async (modelName: 'whisper' | 'llama', retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      const url = getModelUrl(modelName);
      const path = getModelPath(modelName);

      console.log(`Starting download of ${modelName} model... (attempt ${retryCount + 1})`);
      console.log(`URL: ${url}`);
      console.log(`Path: ${path}`);

      // Check if file already exists and remove it for clean download
      const existingFile = await FileSystem.getInfoAsync(path);
      if (existingFile.exists) {
        console.log(`Removing existing ${modelName} file for clean download`);
        await FileSystem.deleteAsync(path);
      }

      const downloadProgress = (progress: FileSystem.DownloadProgressData) => {
        const percentage = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
        console.log(`${modelName} download progress: ${percentage}% (${Math.round(progress.totalBytesWritten / (1024 * 1024))}MB / ${Math.round(progress.totalBytesExpectedToWrite / (1024 * 1024))}MB)`);
        setProgress(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], progress: percentage }
        }));
      };

      const result = await FileSystem.createDownloadResumable(
        url,
        path,
        {},
        downloadProgress
      ).downloadAsync();

      if (result) {
        // Verify the downloaded file
        const downloadedFile = await FileSystem.getInfoAsync(path);
        if (downloadedFile.exists && 'size' in downloadedFile) {
          console.log(`${modelName} file downloaded, size: ${Math.round(downloadedFile.size / (1024 * 1024))}MB`);
        }
        
        setProgress(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], downloaded: true, progress: 100, error: undefined }
        }));
        console.log(`${modelName} model downloaded successfully`);
      } else {
        throw new Error('Download result was null');
      }
    } catch (error) {
      console.error(`Error downloading ${modelName} model (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying ${modelName} download in 2 seconds...`);
        setTimeout(() => {
          downloadModel(modelName, retryCount + 1);
        }, 2000);
      } else {
        setProgress(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], error: `Download failed after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}` }
        }));
      }
    }
  };

  const startDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Download models in parallel
      await Promise.all([
        !progress.whisper.downloaded ? downloadModel('whisper') : Promise.resolve(),
        !progress.llama.downloaded ? downloadModel('llama') : Promise.resolve()
      ]);

      // Load models into memory after download completion
      console.log('Downloads complete, loading models into memory...');
      await loadModelsIntoMemory();

      // Wait a moment then proceed
      setTimeout(() => {
        setIsDownloading(false);
        onReady();
      }, 1000);
    } catch (error) {
      setIsDownloading(false);
      Alert.alert('Download Error', 'Failed to download models. Please try again.');
    }
  };

  const totalProgress = (progress.whisper.progress + progress.llama.progress) / 2;
  const allDownloaded = progress.whisper.downloaded && progress.llama.downloaded;
  const isProcessing = isDownloading || isLoadingModels;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text, fontSize: fonts.xlarge }]}>PocketTranslator</Text>
      
      <View style={styles.progressContainer}>
        <Text style={[styles.progressTitle, { color: colors.text, fontSize: fonts.emphasized }]}>
          {isLoadingModels ? 'Loading Models into Memory...' : 'Preparing AI Models'}
        </Text>
        
        {/* Whisper Progress */}
        <View style={styles.modelProgress}>
          <Text style={[styles.modelName, { color: colors.textSecondary, fontSize: fonts.secondary }]}>{getModelDisplayName('whisper')}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceTransparent }]}>
            <View 
              style={[styles.progressFill, { width: `${progress.whisper.progress}%`, backgroundColor: colors.primary }]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary, fontSize: fonts.small }]}>
            {progress.whisper.downloaded ? '✅ Ready' : `${progress.whisper.progress}%`}
          </Text>
        </View>

        {/* Translation Model Progress */}
        <View style={styles.modelProgress}>
          <Text style={[styles.modelName, { color: colors.textSecondary, fontSize: fonts.secondary }]}>{getModelDisplayName('llama')}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceTransparent }]}>
            <View 
              style={[styles.progressFill, { width: `${progress.llama.progress}%`, backgroundColor: colors.primary }]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary, fontSize: fonts.small }]}>
            {progress.llama.downloaded ? '✅ Ready' : `${progress.llama.progress}%`}
          </Text>
        </View>

        {/* Overall Progress */}
        <View style={[styles.overallProgress, { borderTopColor: colors.border }]}>
          <Text style={[styles.overallProgressText, { color: colors.text, fontSize: fonts.primary }]}>
            Overall: {Math.round(totalProgress)}%
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!allDownloaded && !isProcessing && (
          <TouchableOpacity 
            style={[styles.downloadButton, { backgroundColor: colors.primary }]} 
            onPress={startDownload}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Download AI models"
            accessibilityHint="Tap to download speech recognition and translation models"
          >
            <Text style={[styles.downloadButtonText, { color: colors.buttonText, fontSize: fonts.primary }]}>Download Models</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <Text style={[styles.downloadingText, { color: colors.textSecondary, fontSize: fonts.primary }]}>Downloading models...</Text>
        )}

        {isLoadingModels && (
          <Text style={[styles.downloadingText, { color: colors.textSecondary, fontSize: fonts.primary }]}>Loading models into memory...</Text>
        )}

        {/* Continue to Translator button removed as requested */}

        {showSkip && !isProcessing && (
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={onReady}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Skip download"
            accessibilityHint="Tap to skip model download and proceed to translator"
          >
            <Text style={[styles.skipText, { color: colors.textTertiary, fontSize: fonts.secondary }]}>Skip (For Testing)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ); 
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 40,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  progressTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  modelProgress: {
    marginBottom: 20,
  },
  modelName: {
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'right',
  },
  overallProgress: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  overallProgressText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  downloadButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  downloadButtonText: {
    fontWeight: 'bold',
  },
  continueButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  continueButtonText: {
    fontWeight: 'bold',
  },
  downloadingText: {
    marginBottom: 15,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    textDecorationLine: 'underline',
  },
});
