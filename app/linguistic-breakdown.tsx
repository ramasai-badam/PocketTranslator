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
  [key: string]: string; // Dynamic key based on language (e.g., "japanese", "spanish", "original")
  english: string;
  part_of_speech: string;
  relation: string;
}

interface LinguisticAnalysis {
  sentence: string;
  tokens: TokenData[];
  english_translation: string;
  sentence_meaning: string;
  explanation: string;
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
    // Return the language code directly as that's the key used in the token data
    return originalLanguage;
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
          <Text style={styles.headerTitle}>Linguistic Breakdown</Text>
          <Text style={styles.headerSubtitle}>
            {getLanguageDisplayName(originalLanguage)} → {getLanguageDisplayName(translatedLanguage)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Original Sentence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original Sentence</Text>
          <View style={styles.sentenceContainer}>
            <Text style={styles.sentenceText}>{analysis.sentence}</Text>
            <TouchableOpacity
              style={styles.pronounceButton}
              onPress={() => handlePronounceToken(analysis.sentence, originalLanguage)}
            >
              <Volume2 size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Translation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Translation</Text>
          <View style={styles.sentenceContainer}>
            <Text style={styles.translationText}>{translatedText}</Text>
            <TouchableOpacity
              style={styles.pronounceButton}
              onPress={() => handlePronounceToken(translatedText, translatedLanguage)}
            >
              <Volume2 size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Word Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Word-by-Word Breakdown</Text>
          <Text style={styles.sectionDescription}>
            Tap on any word to see its details and hear pronunciation
          </Text>
          
          <View style={styles.tokensContainer}>
            {analysis.tokens.map((token, index) => (
              <View key={index} style={styles.tokenWrapper}>
                <TouchableOpacity
                  style={[
                    styles.tokenButton,
                    selectedTokenIndex === index && styles.selectedTokenButton
                  ]}
                  onPress={() => handleTokenPress(index)}
                >
                  <Text style={[
                    styles.tokenText,
                    selectedTokenIndex === index && styles.selectedTokenText
                  ]}>
                    {token[originalLanguageKey]}
                  </Text>
                  <TouchableOpacity
                    style={styles.tokenPronounceButton}
                    onPress={() => handlePronounceToken(token[originalLanguageKey], originalLanguage)}
                  >
                    <Volume2 size={14} color="#007AFF" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {selectedTokenIndex === index && (
                  <View style={styles.tokenDetails}>
                    <View style={styles.tokenDetailRow}>
                      <Text style={styles.tokenDetailLabel}>English:</Text>
                      <Text style={styles.tokenDetailValue}>{token.english}</Text>
                    </View>
                    <View style={styles.tokenDetailRow}>
                      <Text style={styles.tokenDetailLabel}>Part of Speech:</Text>
                      <Text style={styles.tokenDetailValue}>{token.part_of_speech}</Text>
                    </View>
                    <View style={styles.tokenDetailRow}>
                      <Text style={styles.tokenDetailLabel}>Relation:</Text>
                      <Text style={styles.tokenDetailValue}>{token.relation}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Grammatical Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grammatical Relations</Text>
          <Text style={styles.explanationText}>{analysis.explanation}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎓 Tap words to explore their meaning and grammatical role
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
  tokensContainer: {
    gap: 12,
  },
  tokenWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  tokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectedTokenButton: {
    backgroundColor: '#2A2A2A',
  },
  tokenText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '500',
    flex: 1,
  },
  selectedTokenText: {
    color: '#007AFF',
  },
  tokenPronounceButton: {
    padding: 4,
    marginLeft: 12,
  },
  tokenDetails: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  tokenDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tokenDetailLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    width: 120,
  },
  tokenDetailValue: {
    fontSize: 14,
    color: '#FFF',
    flex: 1,
    lineHeight: 20,
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