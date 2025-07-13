import React, { useState, useEffect } from 'react'; 
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'; 
import * as FileSystem from 'expo-file-system';
import { MODEL_CONFIG, getModelPath, getModelUrl, getModelSize, getModelDisplayName } from '@/utils/ModelConfig';
import { ModelManager } from '@/utils/ModelManager';

interface ModelDownloadProgress {
  whisper: { progress: number; downloaded: boolean; error?: string };
  llama: { progress: number; downloaded: boolean; error?: string };
}

export default function WelcomeScreen({ onReady }: { onReady: () => void }) { 
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [progress, setProgress] = useState<ModelDownloadProgress>({
    whisper: { progress: 0, downloaded: false },
    llama: { progress: 0, downloaded: false }
  });
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    checkExistingModels();
    // Show skip button after 3 seconds for testing
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const checkExistingModels = async () => {
    try {
      const whisperExists = await FileSystem.getInfoAsync(getModelPath('whisper'));
      const llamaExists = await FileSystem.getInfoAsync(getModelPath('llama'));

      setProgress(prev => ({
        whisper: { ...prev.whisper, downloaded: whisperExists.exists, progress: whisperExists.exists ? 100 : 0 },
        llama: { ...prev.llama, downloaded: llamaExists.exists, progress: llamaExists.exists ? 100 : 0 }
      }));

      // If both models exist, load them into memory
      if (whisperExists.exists && llamaExists.exists) {
        console.log('Both models exist, loading into memory...');
        await loadModelsIntoMemory();
        setTimeout(() => onReady(), 1000);
      }
    } catch (error) {
      console.error('Error checking existing models:', error);
    }
  };

  const loadModelsIntoMemory = async () => {
    setIsLoadingModels(true);
    try {
      console.log('Loading models into memory...');
      
      // Load both models using ModelManager
      await ModelManager.initializeAll();
      console.log('Models loaded into memory successfully');
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
    <View style={styles.container}>
      <Text style={styles.title}>PocketTranslator</Text>
      <Text style={styles.subtitle}>AI-Powered Translation</Text>
      
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>
          {isLoadingModels ? 'Loading Models into Memory...' : 'Preparing AI Models'}
        </Text>
        
        {/* Whisper Progress */}
        <View style={styles.modelProgress}>
          <Text style={styles.modelName}>{getModelDisplayName('whisper')}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progress.whisper.progress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>
            {progress.whisper.downloaded ? '✅ Ready' : `${progress.whisper.progress}%`}
          </Text>
        </View>

        {/* Translation Model Progress */}
        <View style={styles.modelProgress}>
          <Text style={styles.modelName}>{getModelDisplayName('llama')}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progress.llama.progress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>
            {progress.llama.downloaded ? '✅ Ready' : `${progress.llama.progress}%`}
          </Text>
        </View>

        {/* Overall Progress */}
        <View style={styles.overallProgress}>
          <Text style={styles.overallProgressText}>
            Overall: {Math.round(totalProgress)}%
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!allDownloaded && !isProcessing && (
          <TouchableOpacity style={styles.downloadButton} onPress={startDownload}>
            <Text style={styles.downloadButtonText}>Download Models</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <Text style={styles.downloadingText}>Downloading models...</Text>
        )}

        {isLoadingModels && (
          <Text style={styles.downloadingText}>Loading models into memory...</Text>
        )}

        {allDownloaded && !isProcessing && (
          <TouchableOpacity style={styles.continueButton} onPress={onReady}>
            <Text style={styles.continueButtonText}>Continue to Translator</Text>
          </TouchableOpacity>
        )}

        {showSkip && !isProcessing && (
          <TouchableOpacity style={styles.skipButton} onPress={onReady}>
            <Text style={styles.skipText}>Skip (For Testing)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ); 
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 40,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  progressTitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  modelProgress: {
    marginBottom: 20,
  },
  modelName: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'right',
  },
  overallProgress: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  overallProgressText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadingText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 15,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: '#ccc',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
