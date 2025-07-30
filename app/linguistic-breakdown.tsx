import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, BookOpen } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { ModelManager } from '../utils/ModelManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

// Extend global type for caching
declare global {
  var lastBreakdownData: { cacheKey: string; data: any } | null;
}

interface TokenData {
  // Now tokens are arrays: [toLanguageWord, fromLanguageWord, partOfSpeech, relation]
}

interface LinguisticAnalysis {
  sentence: string;
  phrases: string[][]; // Array of arrays, each with 2 string elements: [fromLanguagePhrase, toLanguagePhrase]
  translation: string;
}

export default function LinguisticBreakdownScreen() {
  const params = useLocalSearchParams();
  const originalText = params.originalText as string;
  const translatedText = params.translatedText as string;
  const originalLanguage = params.originalLanguage as string;
  const translatedLanguage = params.translatedLanguage as string;
  const cachedData = params.cachedData as string;

  const [analysis, setAnalysis] = useState<LinguisticAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  useEffect(() => {
    // Check if we have cached data first
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        setAnalysis(parsedData);
        setIsLoading(false);
        console.log('Using cached breakdown data');
        return;
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }

    // Prevent multiple calls for fresh analysis
    if (!hasStartedAnalysis) {
      setHasStartedAnalysis(true);
      performLinguisticAnalysis();
    }
  }, [hasStartedAnalysis, cachedData]);

  const performLinguisticAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting linguistic analysis...');
      const result = await ModelManager.getLinguisticAnalysisWithLlama(
        originalText,
        originalLanguage,
        translatedText,
        translatedLanguage
      );
      
      setAnalysis(result);
      console.log('Linguistic analysis completed:', result);

      // Save the result for caching when user navigates back
      const cacheKey = `${originalText}_${originalLanguage}_${translatedLanguage}`;
      global.lastBreakdownData = {
        cacheKey,
        data: result
      };
      
    } catch (err) {
      console.error('Failed to perform linguistic analysis:', err);
      setError('Failed to analyze sentence structure. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenPress = (index: number) => {
    setSelectedTokenIndex(selectedTokenIndex === index ? null : index);
  };

  const handlePronounceToken = (word: string, languageCode: string) => {
    try {
      Speech.speak(word, {
        language: languageCode,
        pitch: 1.0,
        rate: 0.7, // Slower for learning
      });
    } catch (error) {
      console.error('Failed to pronounce word:', error);
    }
  };

  const getOriginalLanguageKey = () => {
    return originalLanguage;
  };

  const getTranslatedLanguageKey = () => {
    return translatedLanguage;
  };

  const getTokenDisplayText = (token: string[], isTranslatedLanguage: boolean) => {
    // token array format: [fromLanguageWord, toLanguageWord]
    const result = isTranslatedLanguage ? token[1] : token[0];
    
    // Debug logging to see what we're getting
    if (isTranslatedLanguage) {
      console.log(`🔍 Main word for token:`, {
        token,
        result,
        expectedLanguage: translatedLanguage
      });
    }
    
    return result || '';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing sentence structure...</Text>
          <Text style={styles.loadingSubtext}>
            Breaking down "{originalText}" into linguistic components
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={performLinguisticAnalysis}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No analysis data available</Text>
        </View>
      </View>
    );
  }

  const originalLanguageKey = getOriginalLanguageKey();

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
          <Text style={styles.headerTitle}>Breakdown</Text>
          <Text style={styles.headerSubtitle}>
            {getLanguageDisplayName(originalLanguage)} → {getLanguageDisplayName(translatedLanguage)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Word Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionDescription}>
            Tap on any phrase to hear its pronunciation
          </Text>
          
          <View style={styles.twoColumnContainer}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>{getLanguageDisplayName(translatedLanguage)}</Text>
            </View>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>{getLanguageDisplayName(originalLanguage)}</Text>
            </View>
          </View>
          
          <View style={styles.wordsContainer}>
            {analysis.phrases.map((phrase, index) => (
              <View key={index} style={styles.wordPairRow}>
                <TouchableOpacity
                  style={styles.wordButton}
                  onPress={() => handlePronounceToken(getTokenDisplayText(phrase, true), translatedLanguage)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.wordText}>
                    {getTokenDisplayText(phrase, true)}
                  </Text>
                  <Volume2 size={16} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.wordButton}
                  onPress={() => handlePronounceToken(getTokenDisplayText(phrase, false), originalLanguage)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.wordText}>
                    {getTokenDisplayText(phrase, false)}
                  </Text>
                  <Volume2 size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>


      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔊 Tap words to hear their pronunciation and practice speaking
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
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    lineHeight: 20,
  },
  sentenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sentenceText: {
    flex: 1,
    fontSize: 18,
    color: '#FFF',
    lineHeight: 26,
    marginRight: 12,
  },
  translationText: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    marginRight: 12,
  },
  pronounceButton: {
    padding: 8,
  },
  meaningText: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  twoColumnContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  columnHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  wordsContainer: {
    gap: 8,
  },
  wordPairRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  wordText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '500',
    flex: 1,
  },
  explanationText: {
    fontSize: 15,
    color: '#CCC',
    lineHeight: 22,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
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