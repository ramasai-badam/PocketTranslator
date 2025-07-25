import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, Trash2, BookOpen, GraduationCap } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { VocabularyManager, VocabularyEntry } from '../utils/VocabularyManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

// Extend global type for caching
declare global {
  var lastBreakdownData: { cacheKey: string; data: any } | null;
}


export default function VocabularyListScreen() {
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [breakdownCache, setBreakdownCache] = useState<{ [key: string]: any }>({});

  // Key for AsyncStorage
  const BREAKDOWN_CACHE_KEY = 'linguisticBreakdownCache';

  useEffect(() => {
    loadVocabularyWords();
    restoreBreakdownCache();
  }, []);

  // Restore breakdown cache from AsyncStorage
  const restoreBreakdownCache = async () => {
    try {
      const cacheString = await AsyncStorage.getItem(BREAKDOWN_CACHE_KEY);
      if (cacheString) {
        setBreakdownCache(JSON.parse(cacheString));
      }
    } catch (error) {
      console.error('Failed to restore breakdown cache:', error);
    }
  };

  // Save breakdown cache to AsyncStorage
  const persistBreakdownCache = async (cache: { [key: string]: any }) => {
    try {
      await AsyncStorage.setItem(BREAKDOWN_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to persist breakdown cache:', error);
    }
  };

  // Handle caching breakdown data when returning from linguistic breakdown screen
  useFocusEffect(
    React.useCallback(() => {
      // Check if we have breakdown data in the route params (when returning from breakdown)
      const checkForBreakdownData = async () => {
        try {
          // This would be set by the linguistic breakdown screen when user returns
          const savedBreakdown = global.lastBreakdownData;
          if (savedBreakdown) {
            const { cacheKey, data } = savedBreakdown;
            setBreakdownCache(prev => {
              const updated = { ...prev, [cacheKey]: data };
              persistBreakdownCache(updated);
              return updated;
            });
            // Clear the global data after caching
            global.lastBreakdownData = null;
          }
        } catch (error) {
          console.error('Error checking breakdown data:', error);
        }
      };
      checkForBreakdownData();
    }, [])
  );

  const loadVocabularyWords = async () => {
    try {
      const words = await VocabularyManager.getAllVocabularyWords();
      setVocabularyWords(words);
    } catch (error) {
      console.error('Failed to load vocabulary words:', error);
      Alert.alert('Error', 'Failed to load vocabulary words');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVocabularyWords();
  };

  const handleDeleteWord = async (wordId: string) => {
    Alert.alert(
      'Delete Word',
      'Are you sure you want to remove this word from your vocabulary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyManager.deleteVocabularyWord(wordId);
              setVocabularyWords(prev => prev.filter(word => word.id !== wordId));
              Alert.alert('Success', 'Word removed from vocabulary');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete word');
            }
          },
        },
      ]
    );
  };

  const handleClearAllVocabulary = () => {
    Alert.alert(
      'Clear All Vocabulary',
      'Are you sure you want to delete all vocabulary words? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyManager.clearAllVocabulary();
              setVocabularyWords([]);
              Alert.alert('Success', 'All vocabulary words have been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear vocabulary');
            }
          },
        },
      ]
    );
  };

  const handleSpellWord = async (word: string, languageCode: string) => {
    try {
      // Just trim whitespace, don't remove special characters or accents
      const cleanWord = word.trim();
      if (!cleanWord) return;

      // For Japanese, Chinese, Korean - speak at normal rate
      // For other languages - speak slower for spelling practice
      const isAsianLanguage = ['ja', 'ja-JP', 'zh', 'zh-CN', 'zh-TW', 'ko', 'ko-KR'].includes(languageCode);
      const speechRate = isAsianLanguage ? 1.0 : 0.8;

      // Speak the word
      Speech.speak(cleanWord, {
        language: languageCode,
        pitch: 1.0,
        rate: speechRate,
      });
    } catch (error) {
      console.error('Failed to spell word:', error);
    }
  };

  const handleLinguisticBreakdown = (word: VocabularyEntry) => {
    // Create a unique cache key for this translation pair
    const cacheKey = `${word.originalText}_${word.originalLanguage}_${word.translatedLanguage}`;
    
    // Check if we have cached breakdown data
    const cachedBreakdown = breakdownCache[cacheKey];
    
    if (cachedBreakdown) {
      // Use cached data - navigate directly with the cached breakdown
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: word.originalText,
          translatedText: word.translatedText,
          originalLanguage: word.originalLanguage,
          translatedLanguage: word.translatedLanguage,
          cachedData: JSON.stringify(cachedBreakdown),
        }
      });
    } else {
      // No cached data - navigate normally (will trigger API call)
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: word.originalText,
          translatedText: word.translatedText,
          originalLanguage: word.originalLanguage,
          translatedLanguage: word.translatedLanguage,
        }
      });
    }
  };

  const isBreakdownCached = (word: VocabularyEntry) => {
    const cacheKey = `${word.originalText}_${word.originalLanguage}_${word.translatedLanguage}`;
    return !!breakdownCache[cacheKey];
  };

  const renderInteractiveText = (text: string, languageCode: string) => {
    const words = text.split(/(\s+)/).filter(part => part.length > 0);
    
    return (
      <View style={styles.interactiveTextContainer}>
        {words.map((part, index) => {
          // Better word detection that works with all languages including Asian characters
          const isWord = part.trim().length > 0 && !/^\s+$/.test(part);
          
          if (isWord) {
            return (
              <TouchableOpacity
                key={index}
                style={styles.wordButton}
                onPress={() => handleSpellWord(part, languageCode)}
                activeOpacity={0.7}
              >
                <Text style={styles.interactiveWord}>{part}</Text>
              </TouchableOpacity>
            );
          } else {
            return (
              <Text key={index} style={styles.wordSpace}>
                {part}
              </Text>
            );
          }
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading vocabulary...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Vocabulary</Text>
          <Text style={styles.headerSubtitle}>
            {vocabularyWords.length} word{vocabularyWords.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAllVocabulary}
          disabled={vocabularyWords.length === 0}
        >
          <Trash2 size={20} color={vocabularyWords.length > 0 ? "#FF3B30" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Vocabulary Words */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {vocabularyWords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Vocabulary Words Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add words from your translation history to start building your vocabulary
            </Text>
          </View>
        ) : (
          vocabularyWords.map((word) => (
            <View key={word.id} style={styles.wordContainer}>
              <View style={styles.wordHeader}>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageLabel}>
                    {getLanguageDisplayName(word.originalLanguage)} → {getLanguageDisplayName(word.translatedLanguage)}
                  </Text>
                </View>
                
                <View style={styles.wordHeaderRight}>
                  <Text style={styles.dateAdded}>{word.dateAdded}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteWord(word.id)}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Original Text - Interactive */}
              <View style={[styles.textContainer, styles.originalTextContainer]}>
                <View style={styles.textHeader}>
                  <Text style={styles.textLabel}>Original</Text>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => Speech.speak(word.originalText, { language: word.originalLanguage })}
                  >
                    <Volume2 size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.breakdownButton}
                    onPress={() => handleLinguisticBreakdown(word)}
                  >
                    <GraduationCap 
                      size={16} 
                      color={isBreakdownCached(word) ? "#FFD700" : "#34C759"} 
                    />
                  </TouchableOpacity>
                </View>
                {renderInteractiveText(word.originalText, word.originalLanguage)}
              </View>

              {/* Translation - Interactive */}
              <View style={[styles.textContainer, styles.translatedTextContainer]}>
                <View style={styles.textHeader}>
                  <Text style={styles.textLabel}>Translation</Text>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => Speech.speak(word.translatedText, { language: word.translatedLanguage })}
                  >
                    <Volume2 size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                {renderInteractiveText(word.translatedText, word.translatedLanguage)}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {vocabularyWords.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tap words to hear pronunciation • 🎓 Green: fresh analysis, Gold: cached analysis
          </Text>
        </View>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  clearAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  wordContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  wordHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateAdded: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  textContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  originalTextContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  translatedTextContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    marginBottom: 0,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  textLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  speakButton: {
    padding: 4,
  },
  breakdownButton: {
    padding: 4,
  },
  interactiveTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 1,
    marginVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  interactiveWord: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 20,
    fontWeight: '500',
  },
  wordSpace: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 20,
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