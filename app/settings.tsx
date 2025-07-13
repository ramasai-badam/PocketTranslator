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
import { LanguagePackManager, AVAILABLE_LANGUAGE_PACKS, LanguagePack } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

export default function SettingsScreen() {
  const [languagePacks, setLanguagePacks] = useState<LanguagePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLanguagePacks();
  }, []);

  const initializeLanguagePacks = async () => {
    try {
      const packs = await LanguagePackManager.getAllLanguagePacks();
      const packsWithDownloading = packs.map(pack => ({ ...pack, isDownloading: false }));
      setLanguagePacks(packsWithDownloading);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize language packs:', error);
      setIsLoading(false);
    }
  };

  const downloadLanguagePack = async (languageCode: string) => {
    try {
      // Update UI to show downloading state
      setLanguagePacks(prev => 
        prev.map(pack => 
          pack.code === languageCode 
            ? { ...pack, isDownloading: true }
            : pack
        )
      );

      const languageName = getLanguageDisplayName(languageCode);

      // Show alert explaining the download process
      Alert.alert(
        'Download Language Pack',
        `To enable offline speech recognition for ${languageName}, you need to:\n\n1. Go to your device's Settings\n2. Find "Language & Input" or "Voice Recognition"\n3. Download the language pack for ${languageName}\n\n After downloading, return here and we'll mark it as available.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setLanguagePacks(prev => 
                prev.map(pack => 
                  pack.code === languageCode 
                    ? { ...pack, isDownloading: false }
                    : pack
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
                  'Language Pack Downloaded?',
                  'Did you successfully download the language pack from your device settings?',
                  [
                    {
                      text: 'No',
                      onPress: () => {
                        setLanguagePacks(prev => 
                          prev.map(pack => 
                            pack.code === languageCode 
                              ? { ...pack, isDownloading: false }
                              : pack
                          )
                        );
                      }
                    },
                    {
                      text: 'Yes',
                      onPress: async () => {
                        try {
                          await LanguagePackManager.markLanguagePackAsDownloaded(languageCode);
                          setLanguagePacks(prev => 
                            prev.map(pack => 
                              pack.code === languageCode 
                                ? { ...pack, isDownloading: false, isDownloaded: true }
                                : pack
                            )
                          );
                          Alert.alert('Success', 'Language pack is now available for offline speech recognition!');
                        } catch (error) {
                          console.error('Failed to mark language pack as downloaded:', error);
                          Alert.alert('Error', 'Failed to save language pack status.');
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
      console.error('Failed to download language pack:', error);
      Alert.alert('Error', 'Failed to download language pack. Please try again.');
      
      setLanguagePacks(prev => 
        prev.map(pack => 
          pack.code === languageCode 
            ? { ...pack, isDownloading: false }
            : pack
        )
      );
    }
  };

  const removeLanguagePack = async (languageCode: string) => {
    const languageName = getLanguageDisplayName(languageCode);
    
    Alert.alert(
      'Remove Language Pack',
      `Are you sure you want to remove the ${languageName} language pack? You'll need to download it again to use speech recognition for this language.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await LanguagePackManager.markLanguagePackAsRemoved(languageCode);
              setLanguagePacks(prev => 
                prev.map(pack => 
                  pack.code === languageCode 
                    ? { ...pack, isDownloaded: false }
                    : pack
                )
              );
              Alert.alert('Removed', 'Language pack has been removed.');
            } catch (error) {
              console.error('Failed to remove language pack:', error);
              Alert.alert('Error', 'Failed to remove language pack. Default languages cannot be removed.');
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
          <Text style={styles.loadingText}>Loading language packs...</Text>
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
        <Text style={styles.headerTitle}>Language Packs</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerSubtitleContainer}>
        <Text style={styles.headerSubtitle}>
          Download offline language packs for speech recognition
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Languages</Text>
          <Text style={styles.sectionDescription}>
            Languages marked with a checkmark are available for offline speech recognition.
          </Text>
        </View>

        {languagePacks.map((pack) => (
          <View key={pack.code} style={styles.languageItem}>
            <View style={styles.languageInfo}>
              <Text style={styles.languageName}>{pack.name}</Text>
              {pack.isDefault && (
                <Text style={styles.defaultLabel}>Default</Text>
              )}
            </View>
            
            <View style={styles.languageActions}>
              {pack.isDownloading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : pack.isDownloaded ? (
                <View style={styles.actionButtons}>
                  <Check size={24} color="#34C759" />
                  {!pack.isDefault && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeLanguagePack(pack.code)}
                    >
                      <X size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadLanguagePack(pack.code)}
                >
                  <Download size={20} color="#007AFF" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Downloaded language packs work offline and provide better accuracy for speech recognition.
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
