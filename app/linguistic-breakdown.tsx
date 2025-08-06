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
import { useTheme } from '../contexts/ThemeContext';
import { useTextSize } from '../contexts/TextSizeContext';

// Extend global type for ongoing analyses tracking
declare global {
  var ongoingAnalyses: Set<string>;
}

// Initialize global ongoing analyses tracker
if (!global.ongoingAnalyses) {
  global.ongoingAnalyses = new Set<string>();
}

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
  const { colors } = useTheme();
  const { getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  
  // Create consistent font sizing object like other screens
  const fonts = {
    small: textSizeConfig.fontSize * 0.75,      // 12px at medium
    secondary: textSizeConfig.fontSize * 0.875, // 14px at medium  
    primary: textSizeConfig.fontSize,           // 16px at medium
    emphasized: textSizeConfig.fontSize * 1.125, // 18px at medium
    large: textSizeConfig.fontSize * 1.25,      // 20px at medium
  };

  const params = useLocalSearchParams();
  const originalText = params.originalText as string;
  const translatedText = params.translatedText as string;
  const originalLanguage = params.originalLanguage as string;
  const translatedLanguage = params.translatedLanguage as string;
  const cachedData = params.cachedData as string;
  const isOngoing = params.isOngoing as string;
  const cacheKey = params.cacheKey as string; // Use passed cache key instead of generating

  const [analysis, setAnalysis] = useState<LinguisticAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);
  const [isWaitingForOngoing, setIsWaitingForOngoing] = useState(false);

  useEffect(() => {
    // Use passed cache key, fallback to text-based key for backward compatibility
    const finalCacheKey = cacheKey || `${originalText}_${originalLanguage}_${translatedLanguage}`;
    
    console.log('=== LinguisticBreakdown useEffect ===');
    console.log('cacheKey:', finalCacheKey);
    console.log('cachedData:', cachedData ? 'Present' : 'Not present');
    console.log('isOngoing:', isOngoing);
    console.log('ModelManager.isAnalysisInProgress():', ModelManager.isAnalysisInProgress());
    
    // If this is an ongoing analysis, wait for it to complete
    if (isOngoing === 'true') {
      console.log('Waiting for ongoing analysis to complete...');
      setIsWaitingForOngoing(true);
      waitForOngoingAnalysis(finalCacheKey);
      return;
    }
    
    // Check if ANY analysis is currently in progress (not just the same translation)
    if (ModelManager.isAnalysisInProgress()) {
      console.log('Another analysis is in progress, waiting for it to complete...');
      setIsWaitingForOngoing(true);
      waitForAnyOngoingAnalysis(finalCacheKey);
      return;
    }
    
    // Check if we have cached data first
    if (cachedData) {
      try {
        console.log('Found cached data, parsing...');
        const parsedData = JSON.parse(cachedData);
        setAnalysis(parsedData);
        setIsLoading(false);
        console.log('Successfully used cached breakdown data');
        // Remove from ongoing analyses since we have cached data
        global.ongoingAnalyses.delete(finalCacheKey);
        return;
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }

    // Start fresh analysis only if we haven't started yet
    if (!hasStartedAnalysis) {
      console.log('Starting fresh analysis...');
      setHasStartedAnalysis(true);
      performLinguisticAnalysis(finalCacheKey);
    }
  }, [cachedData, isOngoing, cacheKey]); // Added cacheKey to dependencies // Removed hasStartedAnalysis from dependencies

  const waitForOngoingAnalysis = async (cacheKey: string) => {
    const maxWaitTime = 60000; // 60 seconds max wait
    const checkInterval = 1000; // Check every second
    let waitedTime = 0;

    const checkForCompletion = async () => {
      // Check if analysis is no longer ongoing (completed or failed)
      if (!global.ongoingAnalyses.has(cacheKey)) {
        console.log('Ongoing analysis completed, checking for cached result...');
        
        // Check if we have cached result from the completed analysis
        if (global.lastBreakdownData && global.lastBreakdownData.cacheKey === cacheKey) {
          console.log('Found completed analysis result');
          setAnalysis(global.lastBreakdownData.data);
          setIsLoading(false);
          setIsWaitingForOngoing(false);
          return;
        }
        
        // If no cached result, start our own analysis
        console.log('No cached result found, starting fresh analysis');
        setIsWaitingForOngoing(false);
        performLinguisticAnalysis();
        return;
      }

      waitedTime += checkInterval;
      if (waitedTime >= maxWaitTime) {
        console.log('Timeout waiting for ongoing analysis');
        setError('Analysis is taking too long. Please try again.');
        setIsLoading(false);
        setIsWaitingForOngoing(false);
        global.ongoingAnalyses.delete(cacheKey);
        return;
      }

      // Continue waiting
      setTimeout(checkForCompletion, checkInterval);
    };

    checkForCompletion();
  };

  const waitForAnyOngoingAnalysis = async (cacheKey: string) => {
    const maxWaitTime = 60000; // 60 seconds max wait
    const checkInterval = 1000; // Check every second
    let waitedTime = 0;

    const checkForCompletion = async () => {
      // Check if ANY analysis is no longer ongoing (not just this specific translation)
      if (!ModelManager.isAnalysisInProgress()) {
        console.log('All analysis completed, starting our analysis...');
        setIsWaitingForOngoing(false);
        performLinguisticAnalysis(cacheKey);
        return;
      }

      waitedTime += checkInterval;
      if (waitedTime >= maxWaitTime) {
        console.log('Timeout waiting for ongoing analysis');
        setError('Analysis is taking too long. Please try again.');
        setIsLoading(false);
        setIsWaitingForOngoing(false);
        return;
      }

      // Continue waiting
      setTimeout(checkForCompletion, checkInterval);
    };

    checkForCompletion();
  };

  const performLinguisticAnalysis = async (providedCacheKey?: string) => {
    const cacheKey = providedCacheKey || `${originalText}_${originalLanguage}_${translatedLanguage}`;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting linguistic analysis...');
      console.log('Cache key:', cacheKey);
      console.log('Cache key:', cacheKey);
      
      const result = await ModelManager.getLinguisticAnalysisWithLlama(
        originalText,
        originalLanguage,
        translatedText,
        translatedLanguage
      );
      
      console.log('Analysis result received:', result);
      
      // Validate the result structure
      if (!result || !result.phrases || !Array.isArray(result.phrases)) {
        throw new Error('Invalid analysis result structure');
      }
      
      setAnalysis(result);
      console.log('Linguistic analysis completed:', result);

      // Save the result for caching when user navigates back
      global.lastBreakdownData = {
        cacheKey,
        data: result
      };
      
      // Remove from ongoing analyses since analysis is complete
      global.ongoingAnalyses.delete(cacheKey);
      
    } catch (err) {
      console.error('Failed to perform linguistic analysis:', err);
      
      // More specific error messages
      let errorMessage = 'Failed to analyze sentence structure. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('Context is busy')) {
          errorMessage = 'Analysis system is busy. Please wait a moment and try again.';
        } else if (err.message.includes('not initialized')) {
          errorMessage = 'Analysis system is not ready. Please try again.';
        }
      }
      
      setError(errorMessage);
      // Remove from ongoing analyses on error
      global.ongoingAnalyses.delete(cacheKey);
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

  // Handle back navigation - clean up ongoing analysis state
  const handleBackPress = () => {
    const finalCacheKey = cacheKey || `${originalText}_${originalLanguage}_${translatedLanguage}`;
    // Don't remove from ongoing analyses if we're still loading (analysis in progress)
    // Only remove if there was an error or if analysis completed
    if (error || analysis) {
      global.ongoingAnalyses.delete(finalCacheKey);
    }
    router.back();
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: colors.text, fontSize: fonts.emphasized }]}>
            {isWaitingForOngoing ? 'Waiting for analysis to complete...' : 'Analyzing sentence structure...'}
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary, fontSize: fonts.secondary }]}>
            {isWaitingForOngoing 
              ? 'Another analysis is in progress. Please wait...'
              : `Breaking down "${originalText}" into linguistic components`
            }
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { fontSize: fonts.primary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => performLinguisticAnalysis()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Retry the linguistic analysis"
          >
            <Text style={[styles.retryButtonText, { fontSize: fonts.primary }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { fontSize: fonts.primary }]}>No analysis data available</Text>
        </View>
      </View>
    );
  }

  const originalLanguageKey = getOriginalLanguageKey();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceTransparent }]}
          onPress={handleBackPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
        >
          <ArrowLeft size={Math.max(24, fonts.emphasized)} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: fonts.emphasized }]}>Breakdown</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: fonts.small }]}>
            {getLanguageDisplayName(originalLanguage)} → {getLanguageDisplayName(translatedLanguage)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Word Breakdown */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary, fontSize: fonts.secondary }]}>
            Tap on any phrase to hear its pronunciation
          </Text>
          
          <View style={styles.twoColumnContainer}>
            <View style={[styles.columnHeader, { backgroundColor: colors.surface }]}>
              <Text style={[styles.columnTitle, { fontSize: fonts.primary }]}>{getLanguageDisplayName(translatedLanguage)}</Text>
            </View>
            <View style={[styles.columnHeader, { backgroundColor: colors.surface }]}>
              <Text style={[styles.columnTitle, { fontSize: fonts.primary }]}>{getLanguageDisplayName(originalLanguage)}</Text>
            </View>
          </View>
          
          <View style={styles.wordsContainer}>
            {analysis.phrases.map((phrase, index) => (
              <View key={index} style={styles.wordPairRow}>
                <TouchableOpacity
                  style={[styles.wordButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handlePronounceToken(getTokenDisplayText(phrase, true), translatedLanguage)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Pronounce ${getTokenDisplayText(phrase, true)}`}
                  accessibilityHint={`Hear pronunciation in ${getLanguageDisplayName(translatedLanguage)}`}
                >
                  <Text style={[styles.wordText, { color: colors.text, fontSize: fonts.emphasized }]}>
                    {getTokenDisplayText(phrase, true)}
                  </Text>
                  <Volume2 size={Math.max(16, fonts.primary * 1.0)} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.wordButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handlePronounceToken(getTokenDisplayText(phrase, false), originalLanguage)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Pronounce ${getTokenDisplayText(phrase, false)}`}
                  accessibilityHint={`Hear pronunciation in ${getLanguageDisplayName(originalLanguage)}`}
                >
                  <Text style={[styles.wordText, { color: colors.text, fontSize: fonts.emphasized }]}>
                    {getTokenDisplayText(phrase, false)}
                  </Text>
                  <Volume2 size={Math.max(16, fonts.primary * 1.0)} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>


      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: fonts.secondary }]}>
          🔊 Tap words to hear their pronunciation and practice speaking
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
    paddingHorizontal: 40,
  },
  loadingText: {
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
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
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  sentenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sentenceText: {
    flex: 1,
    lineHeight: 26,
    marginRight: 12,
  },
  translationText: {
    flex: 1,
    lineHeight: 24,
    marginRight: 12,
  },
  pronounceButton: {
    padding: 8,
  },
  meaningText: {
    lineHeight: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    marginHorizontal: 4,
    borderRadius: 8,
  },
  columnTitle: {
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  wordText: {
    fontWeight: '500',
    flex: 1,
  },
  explanationText: {
    lineHeight: 22,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});