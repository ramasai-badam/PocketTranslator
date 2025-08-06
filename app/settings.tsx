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
  Platform,
  NativeModules,
  PanResponder,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Download, Check, X, ArrowLeft, Type } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { TTSVoiceManager, AVAILABLE_TTS_VOICES, TTSVoice } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';
import { TEXT_SIZE_OPTIONS, TextSizeId } from '../utils/SettingsManager';
import { useTextSize } from '../contexts/TextSizeContext';
import { useTheme } from '../contexts/ThemeContext';

// Get the native module
const { SettingsModule } = NativeModules;

export default function SettingsScreen() {
  const [ttsVoices, setTTSVoices] = useState<TTSVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { textSize: currentTextSize, updateTextSize, refreshTextSize } = useTextSize();
  const { theme, colors, updateTheme } = useTheme();
  const [sliderWidth, setSliderWidth] = useState(200);

  const getCurrentIndex = () => {
    return TEXT_SIZE_OPTIONS.findIndex(opt => opt.id === currentTextSize);
  };

  const getTextSizeFromPosition = (position: number) => {
    const normalizedPosition = Math.max(0, Math.min(1, position / sliderWidth));
    const index = Math.round(normalizedPosition * (TEXT_SIZE_OPTIONS.length - 1));
    return TEXT_SIZE_OPTIONS[index].id;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      // Haptic feedback when starting to drag
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { locationX } = evt.nativeEvent;
      const newTextSize = getTextSizeFromPosition(locationX);
      if (newTextSize !== currentTextSize) {
        handleTextSizeChangeWithoutHaptic(newTextSize);
      }
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      const newTextSize = getTextSizeFromPosition(locationX);
      if (newTextSize !== currentTextSize) {
        handleTextSizeChangeWithoutHaptic(newTextSize);
      }
    },
    onPanResponderRelease: () => {
      // Light haptic feedback when releasing
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  useEffect(() => {
    // Defer initialization to avoid blocking the navigation animation
    const timeoutId = setTimeout(() => {
      initializeTTSVoices();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Refresh TTS voices when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        const timeoutId = setTimeout(() => {
          initializeTTSVoices();
          refreshTextSize(); // Also refresh text size
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }, [isLoading, refreshTextSize])
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

  const handleTextSizeChange = async (textSizeId: TextSizeId) => {
    try {
      // Add haptic feedback for better UX
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateTextSize(textSizeId);
    } catch (error) {
      console.error('Failed to update text size:', error);
      Alert.alert('Error', 'Failed to update text size. Please try again.');
    }
  };

  const handleTextSizeChangeWithoutHaptic = async (textSizeId: TextSizeId) => {
    try {
      await updateTextSize(textSizeId);
    } catch (error) {
      console.error('Failed to update text size:', error);
    }
  };

  const handleThemeToggle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newTheme = theme === 'light' ? 'dark' : 'light';
      await updateTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      Alert.alert('Error', 'Failed to update theme. Please try again.');
    }
  };

  const handleThemeSelection = async (selectedTheme: 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateTheme(selectedTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      Alert.alert('Error', 'Failed to update theme. Please try again.');
    }
  };

  const getThemeDisplayName = (themeMode: string) => {
    switch (themeMode) {
      case 'light':
        return '☀️ Light';
      case 'dark':
        return '🌙 Dark';
      case 'high-contrast-light':
        return '⚫ High Contrast Light';
      case 'high-contrast-dark':
        return '⚪ High Contrast Dark';
      default:
        return '🌙 Dark';
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
        `To enable text-to-speech for ${languageName}:\n\n1. We'll open TTS Settings\n2. Press ⚙️ button \n3. Select Install voice data\n4. Find and download the voice pack for ${languageName}\n6. Return here and confirm\n\nNote: Path may vary by device manufacturer.`,
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
                // Try to open TTS settings directly on Android using native module
                if (Platform.OS === 'android') {
                  try {
                    // Check if native module is available
                    if (SettingsModule && SettingsModule.openSettings) {
                      // ✅ USE THE NATIVE MODULE HERE
                      await SettingsModule.openSettings('com.android.settings.TTS_SETTINGS');
                      console.log('Opened TTS settings directly via Native Module');
                    } else {
                      console.log('SettingsModule not available, using fallback');
                      throw new Error('Native module not available');
                    }
                  } catch (androidError) {
                    console.log('Direct TTS settings failed, trying general settings:', androidError);
                    // Fallback to general app settings if the specific one fails
                    await Linking.openSettings();
                    console.log('Opened general settings as fallback');
                  }
                } else {
                  // iOS - open general settings
                  await Linking.openSettings();
                  console.log('Opened device settings (iOS)');
                }
              } catch (error) {
                console.error('Failed to open settings:', error);
                Alert.alert(
                  'Settings Error', 
                  'Could not open settings automatically. Please:\n\n1. Open Settings manually\n2. Search for "Text-to-speech"\n3. Download the voice pack\n4. Return here to confirm'
                );
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading TTS voices...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.button }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.buttonText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.headerSubtitleContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
          Customize your translation experience
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
            Choose your preferred theme. High contrast themes provide better visibility for visually impaired users.
          </Text>
        </View>

        <View style={[styles.themeContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.themeLabel, { color: colors.text }]}>Theme Options</Text>
          
          {/* Regular Light Theme */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              { 
                backgroundColor: theme === 'light' ? colors.primary + '20' : colors.surface,
                borderColor: theme === 'light' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => handleThemeSelection('light')}
          >
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { color: colors.text }]}>☀️ Light</Text>
              <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                Standard light theme with comfortable contrast
              </Text>
            </View>
            {theme === 'light' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>
          
          {/* Regular Dark Theme */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              { 
                backgroundColor: theme === 'dark' ? colors.primary + '20' : colors.surface,
                borderColor: theme === 'dark' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => handleThemeSelection('dark')}
          >
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { color: colors.text }]}>🌙 Dark</Text>
              <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                Standard dark theme for low-light environments
              </Text>
            </View>
            {theme === 'dark' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>
          
          {/* High Contrast Light Theme */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              { 
                backgroundColor: theme === 'high-contrast-light' ? colors.primary + '20' : colors.surface,
                borderColor: theme === 'high-contrast-light' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => handleThemeSelection('high-contrast-light')}
          >
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { color: colors.text }]}>⚫ High Contrast Light</Text>
              <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                Maximum contrast light theme for better visibility
              </Text>
            </View>
            {theme === 'high-contrast-light' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>
          
          {/* High Contrast Dark Theme */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              { 
                backgroundColor: theme === 'high-contrast-dark' ? colors.primary + '20' : colors.surface,
                borderColor: theme === 'high-contrast-dark' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => handleThemeSelection('high-contrast-dark')}
          >
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { color: colors.text }]}>⚪ High Contrast Dark</Text>
              <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                Maximum contrast dark theme for better visibility
              </Text>
            </View>
            {theme === 'high-contrast-dark' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Text Size</Text>
          <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
            Choose the text size for translation display to improve readability.
          </Text>
        </View>

        <View style={[styles.textSizeContainer, { borderBottomColor: colors.border }]}>
          <View style={styles.textSizeHeader}>
            <Type size={18} color={colors.buttonText} />
            <Text style={[styles.currentSizeLabel, { color: colors.text }]}>
              {TEXT_SIZE_OPTIONS.find(opt => opt.id === currentTextSize)?.label || 'Large'}
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, { fontSize: 12, color: colors.textTertiary }]}>A</Text>
            <View 
              style={styles.slider}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setSliderWidth(width);
              }}
              {...panResponder.panHandlers}
            >
              <View style={[styles.sliderTrack, { backgroundColor: colors.borderTransparent }]} />
              {TEXT_SIZE_OPTIONS.map((option, index) => {
                const isSelected = currentTextSize === option.id;
                const position = (index / (TEXT_SIZE_OPTIONS.length - 1)) * 100;
                return (
                  <View
                    key={option.id}
                    style={[styles.sliderPoint, { left: `${position}%` }]}
                  >
                    <Text style={[
                      styles.sliderPointLabel,
                      { 
                        fontSize: option.fontSize * 0.8, 
                        lineHeight: option.fontSize * 0.8 + 4,
                        color: colors.textTertiary,
                      }
                    ]}>
                      A
                    </Text>
                    <View style={styles.sliderPointDot}>
                      <View style={[
                        styles.sliderDotInner,
                        { backgroundColor: colors.borderTransparent },
                        isSelected && styles.sliderDotInnerActive,
                      ]} />
                    </View>
                  </View>
                );
              })}
              {/* Active slider thumb */}
              <View style={[
                styles.sliderThumb,
                { 
                  left: `${(getCurrentIndex() / (TEXT_SIZE_OPTIONS.length - 1)) * 100}%`,
                  borderColor: colors.surface,
                }
              ]} />
            </View>
            <Text style={[styles.sliderLabel, { fontSize: 18, color: colors.textTertiary }]}>A</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TTS Voices</Text>
          <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
            Voices marked with a checkmark are available for text-to-speech output.
          </Text>
        </View>

        {ttsVoices.map((voice) => (
          <View key={voice.code} style={[styles.languageItem, { borderBottomColor: colors.border }]}>
            <View style={styles.languageInfo}>
              <Text style={[styles.languageName, { color: colors.text }]}>{voice.name}</Text>
              {voice.isDefault && (
                <Text style={[styles.defaultLabel, { backgroundColor: colors.button }]}>Default</Text>
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
                  style={[styles.downloadButton, { backgroundColor: colors.button }]}
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

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          💡 Tip: Adjust text size for better readability and download TTS voices to hear translations in different languages.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#007AFF',
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
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Text Size Settings styles
  textSizeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  textSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  currentSizeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  slider: {
    flex: 1,
    height: 60,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    top: '50%',
    marginTop: -1,
  },
  sliderPoint: {
    position: 'absolute',
    width: 20,
    height: 60,
    marginLeft: -10,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  sliderPointLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  sliderPointDot: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    marginTop: -10,
  },
  sliderDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sliderDotActive: {
    // Active dot container styles if needed
  },
  sliderDotInnerActive: {
    backgroundColor: '#007AFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    top: '50%',
    marginTop: -12,
  },
  previewText: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 10,
  },
  // Theme Settings styles
  themeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  themeToggle: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 2,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  themeToggleSlider: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  themeValue: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  // New theme option styles
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeOptionContent: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
