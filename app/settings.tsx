import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Download, Check, X, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { TTSVoiceManager, AVAILABLE_TTS_VOICES, TTSVoice } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

export default function SettingsScreen() {
  const [ttsVoices, setTTSVoices] = useState<TTSVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeTTSVoices();
  }, []);

  // Refresh TTS voices when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        initializeTTSVoices();
      }
    }, [isLoading])
  );

  const initializeTTSVoices = async () => {
    try {
      console.log('Loading TTS voices from storage...');
      const voices = await TTSVoiceManager.getAllTTSVoices();
      console.log('TTS voices loaded:', voices.map(v => ({ code: v.code, name: v.name, isAvailable: v.isAvailable, isDefault: v.isDefault })));
      
      const voicesWithDownloading = voices.map(voice => ({ ...voice, isDownloading: false }));
      setTTSVoices(voicesWithDownloading);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize TTS voices:', error);
      setIsLoading(false);
    }
  };

  const enableTTSVoice = async (languageCode: string) => {
    try {
      // Update UI to show enabling state
      setTTSVoices(prev => 
        prev.map(voice => 
          voice.code === languageCode 
            ? { ...voice, isDownloading: true }
            : voice
        )
      );

      const languageName = getLanguageDisplayName(languageCode);

      // Show alert explaining the download process
      Alert.alert(
        'Enable TTS Voice',
        `To enable text-to-speech for ${languageName}, you need to:\n\n1. Go to your device's Settings\n2. Find "Language & Input" or "Text-to-Speech"\n3. Download the voice for ${languageName}\n\nAfter downloading, return here and we'll mark it as available.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setTTSVoices(prev => 
                prev.map(voice => 
                  voice.code === languageCode 
                    ? { ...voice, isDownloading: false }
                    : voice
                )
              );
            }
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                // Try to open device settings
                await Linking.openSettings();
              } catch (error) {
                console.error('Failed to open settings:', error);
              }
              
              // Show confirmation dialog after user returns
              setTimeout(() => {
                Alert.alert(
                  'TTS Voice Downloaded?',
                  'Did you successfully download the TTS voice from your device settings?',
                  [
                    {
                      text: 'No',
                      onPress: () => {
                        setTTSVoices(prev => 
                          prev.map(voice => 
                            voice.code === languageCode 
                              ? { ...voice, isDownloading: false }
                              : voice
                          )
                        );
                      }
                    },
                    {
                      text: 'Yes',
                      onPress: async () => {
                        try {
                          await TTSVoiceManager.markTTSVoiceAsAvailable(languageCode);
                          setTTSVoices(prev => 
                            prev.map(voice => 
                              voice.code === languageCode 
                                ? { ...voice, isDownloading: false, isAvailable: true }
                                : voice
                            )
                          );
                          Alert.alert('Success', 'TTS voice is now available!');
                        } catch (error) {
                          console.error('Failed to mark TTS voice as available:', error);
                          Alert.alert('Error', 'Failed to save TTS voice status.');
                        }
                      }
                    }
                  ]
                );
              }, 1000);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to enable TTS voice:', error);
      Alert.alert('Error', 'Failed to enable TTS voice. Please try again.');
      
      setTTSVoices(prev => 
        prev.map(voice => 
          voice.code === languageCode 
            ? { ...voice, isDownloading: false }
            : voice
        )
      );
    }
  };

  const removeTTSVoice = async (languageCode: string) => {
    const languageName = getLanguageDisplayName(languageCode);
    
    Alert.alert(
      'Disable TTS Voice',
      `Are you sure you want to disable the ${languageName} TTS voice? You'll need to enable it again to hear translations in this language.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              await TTSVoiceManager.markTTSVoiceAsUnavailable(languageCode);
              setTTSVoices(prev => 
                prev.map(voice => 
                  voice.code === languageCode 
                    ? { ...voice, isAvailable: false }
                    : voice
                )
              );
              Alert.alert('Disabled', 'TTS voice has been disabled.');
            } catch (error) {
              console.error('Failed to disable TTS voice:', error);
              Alert.alert('Error', 'Failed to disable TTS voice. Default voices cannot be disabled.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading TTS voices...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TTS Voice Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerSubtitleContainer}>
        <Text style={styles.headerSubtitle}>
          Manage text-to-speech voices for translation output
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available TTS Voices</Text>
          <Text style={styles.sectionDescription}>
            Voices marked with a checkmark are available for text-to-speech output.
          </Text>
        </View>

        {ttsVoices.map((voice) => (
          <View key={voice.code} style={styles.languageItem}>
            <View style={styles.languageInfo}>
              <Text style={styles.languageName}>{voice.name}</Text>
              {voice.isDefault && (
                <Text style={styles.defaultLabel}>Default</Text>
              )}
            </View>
            
            <View style={styles.languageActions}>
              {voice.isDownloading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : voice.isAvailable ? (
                <View style={styles.actionButtons}>
                  <Check size={24} color="#34C759" />
                  {!voice.isDefault && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeTTSVoice(voice.code)}
                    >
                      <X size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => enableTTSVoice(voice.code)}
                >
                  <Download size={20} color="#007AFF" />
                  <Text style={styles.downloadButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Download TTS voices from your device settings to hear translations in different languages.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  languageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  downloadButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
