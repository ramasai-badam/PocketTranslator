import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, Trash2, BookOpen, GraduationCap } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { VocabularyManager, VocabularyEntry } from '../utils/VocabularyManager';
import { TranslationHistoryManager, TranslationEntry } from '../utils/TranslationHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguageDisplayName } from '../utils/LanguageConfig';
import { ModelManager } from '../utils/ModelManager';
import { useTheme } from '../contexts/ThemeContext';
import { useTextSize } from '../hooks/useTextSize';

// Extend global type for caching
declare global {
  var lastBreakdownData: { cacheKey: string; data: any } | null;
  var ongoingAnalyses: Set<string>;
}

// Initialize global ongoing analyses tracker
if (!global.ongoingAnalyses) {
  global.ongoingAnalyses = new Set<string>();
}

// Combined interface for vocabulary items with translation data
interface VocabularyItem {
  vocabularyEntry: VocabularyEntry;
  translationEntry: TranslationEntry | null;
}

// Memoized vocabulary item component
const VocabularyItem = memo(({ item, onDelete, onBreakdown, getBreakdownState, colors, fonts, dynamicStyles }: {
  item: VocabularyItem;
  onDelete: (id: string) => void;
  onBreakdown: (item: VocabularyItem) => void;
  getBreakdownState: (item: VocabularyItem) => 'cached' | 'analyzing' | 'fresh';
  colors: any;
  fonts: any;
  dynamicStyles: any;
}) => {
  if (!item.translationEntry) return null;
  
  const { vocabularyEntry, translationEntry } = item;
  const breakdownState = getBreakdownState(item);

  const handleSpellWord = useCallback(async (word: string, languageCode: string) => {
    try {
      const cleanWord = word.trim();
      if (!cleanWord) return;

      const isAsianLanguage = ['ja', 'ja-JP', 'zh', 'zh-CN', 'zh-TW', 'ko', 'ko-KR'].includes(languageCode);
      const speechRate = isAsianLanguage ? 1.0 : 0.8;

      Speech.speak(cleanWord, {
        language: languageCode,
        pitch: 1.0,
        rate: speechRate,
      });
    } catch (error) {
      console.error('Failed to spell word:', error);
    }
  }, []);

  const renderInteractiveText = useCallback((text: string, languageCode: string) => {
    const words = text.split(/(\s+)/).filter(part => part.length > 0);
    
    return (
      <View style={styles.interactiveTextContainer}>
        {words.map((part, index) => {
          const isWord = part.trim().length > 0 && !/^\s+$/.test(part);
          
          if (isWord) {
            return (
              <TouchableOpacity
                key={index}
                style={[dynamicStyles.wordButton, { backgroundColor: colors.surfaceTransparent, borderColor: colors.borderTransparent }]}
                onPress={() => handleSpellWord(part, languageCode)}
                activeOpacity={0.7}
              >
                <Text style={[dynamicStyles.interactiveWord, { color: colors.text, fontSize: fonts.primary }]}>{part}</Text>
              </TouchableOpacity>
            );
          } else {
            return (
              <Text key={index} style={[dynamicStyles.wordSpace, { color: colors.text, fontSize: fonts.primary }]}>
                {part}
              </Text>
            );
          }
        })}
      </View>
    );
  }, [handleSpellWord, colors, fonts, dynamicStyles]);
  
  return (
    <View style={[styles.wordContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.wordHeader}>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageLabel, { color: colors.primary, fontSize: fonts.secondary }]}>
            {getLanguageDisplayName(translationEntry.fromLanguage)} → {getLanguageDisplayName(translationEntry.toLanguage)}
          </Text>
        </View>
        
        <View style={styles.wordHeaderRight}>
          <Text style={[styles.dateAdded, { color: colors.textSecondary, fontSize: fonts.small }]}>{vocabularyEntry.dateAdded}</Text>
          <TouchableOpacity
            style={styles.breakdownButton}
            onPress={() => onBreakdown(item)}
          >
            <GraduationCap 
              size={Math.max(14, fonts.primary * 0.9)} 
              color={
                breakdownState === 'cached' ? "#FFD700" : 
                breakdownState === 'analyzing' ? "#007AFF" : 
                "#34C759"
              } 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(vocabularyEntry.translationId)}
          >
            <Trash2 size={Math.max(14, fonts.primary * 0.9)} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Original Text */}
      <View style={[styles.textContainer, styles.originalTextContainer]}>
        <View style={styles.textHeader}>
          <Text style={[styles.textLabel, { color: colors.textSecondary, fontSize: fonts.small }]}>Original</Text>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => Speech.speak(translationEntry.originalText, { language: translationEntry.fromLanguage })}
          >
            <Volume2 size={Math.max(14, fonts.primary * 0.9)} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {renderInteractiveText(translationEntry.originalText, translationEntry.fromLanguage)}
      </View>

      {/* Translation */}
      <View style={[styles.textContainer, styles.translatedTextContainer]}>
        <View style={styles.textHeader}>
          <Text style={[styles.textLabel, { color: colors.textSecondary, fontSize: fonts.small }]}>Translation</Text>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => Speech.speak(translationEntry.translatedText, { language: translationEntry.toLanguage })}
          >
            <Volume2 size={Math.max(14, fonts.primary * 0.9)} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {renderInteractiveText(translationEntry.translatedText, translationEntry.toLanguage)}
      </View>
    </View>
  );
});

// Empty state component
const EmptyComponent = memo(({ colors, fonts }: { colors: any; fonts: any }) => (
  <View style={styles.emptyContainer}>
    <BookOpen size={Math.max(40, fonts.emphasized * 2.4)} color={colors.textTertiary} />
    <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fonts.emphasized }]}>No Vocabulary Words Yet</Text>
    <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: fonts.primary }]}>
      Add words from your translation history to start building your vocabulary
    </Text>
  </View>
));

// Loading footer component
const LoadingFooter = memo(({ colors, fonts }: { colors: any; fonts: any }) => (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <Text style={[styles.loadingText, { color: colors.text, fontSize: fonts.primary }]}>Loading more...</Text>
  </View>
));


export default function VocabularyListScreen() {
  const { colors } = useTheme();
  const { getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  
  // Use the same font scaling pattern as TranslationDisplay
  const fonts = {
    // Primary content text (same as translation display)
    primary: textSizeConfig.fontSize,
    // Emphasized text (same as translation display emphasized)
    emphasized: textSizeConfig.fontSize + 2,
    // Secondary text (2px smaller than primary)
    secondary: Math.max(10, textSizeConfig.fontSize - 2),
    // Small text (4px smaller than primary)
    small: Math.max(8, textSizeConfig.fontSize - 4),
  };

  // Dynamic styles that scale with font size to prevent text clipping
  const dynamicStyles = {
    wordButton: {
      paddingHorizontal: 4,
      // Scale padding based on font size to prevent clipping of descenders
      paddingVertical: Math.max(2, Math.round(textSizeConfig.fontSize * 0.15)),
      borderRadius: 6,
      marginHorizontal: 1,
      marginVertical: 1,
      borderWidth: 1,
    },
    interactiveWord: {
      // Scale line height based on font size for proper descender space
      lineHeight: Math.max(20, Math.round(textSizeConfig.fontSize * 1.3)),
      fontWeight: '500',
    },
    wordSpace: {
      // Scale line height to match interactive words
      lineHeight: Math.max(20, Math.round(textSizeConfig.fontSize * 1.3)),
    },
  };
  
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [breakdownCache, setBreakdownCache] = useState<{ [key: string]: any }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [ongoingAnalyses, setOngoingAnalyses] = useState<Set<string>>(new Set());

  // Simple pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Key for AsyncStorage
  const BREAKDOWN_CACHE_KEY = 'linguisticBreakdownCache';

  useEffect(() => {
    loadVocabularyItems();
    restoreBreakdownCache();
    // Restore ongoing analyses state
    setOngoingAnalyses(new Set(global.ongoingAnalyses));
    
    // Set up periodic check for completed background analyses
    const checkInterval = setInterval(() => {
      // Check if we have completed analysis data
      if (global.lastBreakdownData) {
        const { cacheKey, data } = global.lastBreakdownData;
        console.log('Found completed background analysis:', cacheKey);
        setBreakdownCache(prev => {
          const updated = { ...prev, [cacheKey]: data };
          persistBreakdownCache(updated);
          return updated;
        });
        // Clear the global data after caching
        global.lastBreakdownData = null;
        
        // Remove from ongoing analyses since it's completed
        global.ongoingAnalyses.delete(cacheKey);
        setOngoingAnalyses(new Set(global.ongoingAnalyses));
      }
      
      // Update ongoing analyses state to reflect current status
      setOngoingAnalyses(new Set(global.ongoingAnalyses));
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(checkInterval);
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
            console.log('Caching completed background analysis:', cacheKey);
            setBreakdownCache(prev => {
              const updated = { ...prev, [cacheKey]: data };
              persistBreakdownCache(updated);
              return updated;
            });
            // Clear the global data after caching
            global.lastBreakdownData = null;
            
            // Also remove from ongoing analyses since it's completed
            global.ongoingAnalyses.delete(cacheKey);
            setOngoingAnalyses(new Set(global.ongoingAnalyses));
          }
        } catch (error) {
          console.error('Error checking breakdown data:', error);
        }
      };

      checkForBreakdownData();
      // Also update the ongoing analyses state when screen regains focus
      setOngoingAnalyses(new Set(global.ongoingAnalyses));
    }, [])
  );

  const loadVocabularyItems = async () => {
    try {
      // Get vocabulary entries (which contain translation IDs)
      const vocabularyEntries = await VocabularyManager.getAllVocabularyEntries();
      
      // Get all translation entries to match against vocabulary
      const allTranslations = await TranslationHistoryManager.getAllTranslations();
      
      // Combine vocabulary entries with their corresponding translation data
      const items: VocabularyItem[] = vocabularyEntries.map(vocabEntry => {
        const translationEntry = allTranslations.find(trans => trans.id === vocabEntry.translationId);
        return {
          vocabularyEntry: vocabEntry,
          translationEntry: translationEntry || null
        };
      }).filter(item => item.translationEntry !== null); // Only show items with valid translation data

      setVocabularyItems(items);
    } catch (error) {
      console.error('Failed to load vocabulary items:', error);
      Alert.alert('Error', 'Failed to load vocabulary items');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1); // Reset to first page
    loadVocabularyItems();
  }, []);

  // Simple pagination: load more items
  const loadMore = useCallback(() => {
    if (loadingMore) return;
    
    const maxItems = vocabularyItems.length;
    const currentItems = currentPage * ITEMS_PER_PAGE;
    
    if (currentItems >= maxItems) return; // No more items
    
    setLoadingMore(true);
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setLoadingMore(false);
    }, 200);
  }, [loadingMore, currentPage, vocabularyItems.length, ITEMS_PER_PAGE]);

  // Get items to display (paginated)
  const displayedItems = vocabularyItems.slice(0, currentPage * ITEMS_PER_PAGE);

  const handleDeleteWord = async (translationId: string) => {
    setDeleteTargetId(translationId);
    setShowDeleteModal(true);
  };

  const confirmDeleteWord = async () => {
    if (!deleteTargetId) return;
    try {
      await VocabularyManager.removeFromVocabulary(deleteTargetId);
      setVocabularyItems(prev => prev.filter(item => item.vocabularyEntry.translationId !== deleteTargetId));
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    } catch (error) {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      Alert.alert('Error', 'Failed to delete word');
    }
  };

  const cancelDeleteWord = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const handleClearAllVocabulary = () => {
    setShowClearAllModal(true);
  };

  const confirmClearAllVocabulary = async () => {
    try {
      await VocabularyManager.clearAllVocabulary();
      setVocabularyItems([]);
      setShowClearAllModal(false);
    } catch (error) {
      setShowClearAllModal(false);
      Alert.alert('Error', 'Failed to clear vocabulary');
    }
  };

  const cancelClearAllVocabulary = () => {
    setShowClearAllModal(false);
  };

  const handleLinguisticBreakdown = (item: VocabularyItem) => {
    if (!item.translationEntry) return;
    
    const { vocabularyEntry, translationEntry } = item;
    // Use translationId as cache key instead of text-based key
    const cacheKey = vocabularyEntry.translationId;
    
    console.log('Breakdown requested for cache key:', cacheKey);
    console.log('Current ongoing analyses:', Array.from(global.ongoingAnalyses));
    console.log('Cache status:', !!breakdownCache[cacheKey]);
    console.log('Any analysis in progress:', ModelManager.isAnalysisInProgress());
    
    // Check if ANY analysis is already in progress (not just this specific translation)
    if (ModelManager.isAnalysisInProgress()) {
      console.log('Another analysis is in progress, user will wait for it to complete');
      // Navigate to analyzing screen with waiting state
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
          cacheKey: cacheKey, // Pass the cache key for easier tracking
          isOngoing: 'true', // Flag to indicate we need to wait for analysis to complete
        }
      });
      return;
    }
    
    // Check if analysis is already in progress for this specific translation
    if (global.ongoingAnalyses.has(cacheKey)) {
      console.log('Analysis already in progress for:', cacheKey);
      // Navigate to analyzing screen
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
          cacheKey: cacheKey,
          isOngoing: 'true', // Flag to indicate this is an ongoing analysis
        }
      });
      return;
    }
    
    // Check if we have cached breakdown data
    const cachedBreakdown = breakdownCache[cacheKey];
    
    if (cachedBreakdown) {
      console.log('=== Using cached breakdown data ===');
      console.log('cacheKey:', cacheKey);
      console.log('cachedBreakdown keys:', Object.keys(cachedBreakdown));
      console.log('cachedBreakdown:', cachedBreakdown);
      // Use cached data - navigate directly with the cached breakdown
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
          cacheKey: cacheKey,
          cachedData: JSON.stringify(cachedBreakdown),
        }
      });
    } else {
      console.log('Starting fresh analysis');
      // No cached data - mark as ongoing and navigate (will trigger API call)
      global.ongoingAnalyses.add(cacheKey);
      setOngoingAnalyses(new Set(global.ongoingAnalyses));
      
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
          cacheKey: cacheKey,
        }
      });
    }
  };

  const isBreakdownCached = (item: VocabularyItem) => {
    if (!item.translationEntry) return 'fresh';
    
    const { vocabularyEntry } = item;
    const cacheKey = vocabularyEntry.translationId;
    const isCached = !!breakdownCache[cacheKey];
    const isAnalyzing = global.ongoingAnalyses.has(cacheKey) || ModelManager.isAnalysisInProgress();
    
    // Return different states: cached (gold), analyzing (blue), fresh (green)
    return isCached ? 'cached' : (isAnalyzing ? 'analyzing' : 'fresh');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#1a1a1a' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text, fontSize: fonts.primary }]}>Loading vocabulary...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#1a1a1a' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceTransparent }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={Math.max(20, fonts.emphasized * 1.2)} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: fonts.emphasized }]}>My Vocabulary</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: fonts.small }]}>
            {vocabularyItems.length} Translation{vocabularyItems.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.clearAllButton, { backgroundColor: colors.surfaceTransparent }]}
          onPress={handleClearAllVocabulary}
          disabled={vocabularyItems.length === 0}
        >
          <Trash2 size={Math.max(18, fonts.emphasized)} color={vocabularyItems.length > 0 ? "#FF3B30" : colors.disabled} />
        </TouchableOpacity>
      </View>

      {/* Vocabulary Words */}
      <FlatList
        data={displayedItems}
        keyExtractor={(item: VocabularyItem) => item.vocabularyEntry.translationId}
        renderItem={({ item }: { item: VocabularyItem }) => (
          <VocabularyItem 
            item={item}
            onDelete={handleDeleteWord}
            onBreakdown={handleLinguisticBreakdown}
            getBreakdownState={isBreakdownCached}
            colors={colors}
            fonts={fonts}
            dynamicStyles={dynamicStyles}
          />
        )}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyComponent colors={colors} fonts={fonts} />}
        ListFooterComponent={loadingMore ? <LoadingFooter colors={colors} fonts={fonts} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {vocabularyItems.length > 0 && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: fonts.secondary }]}>
            💡 Tap words to hear pronunciation • 🎓 Green: fresh analysis, Blue: analyzing, Gold: cached
          </Text>
        </View>
      )}

      {/* Delete Word Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelDeleteWord}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.deleteModalTitle, { color: colors.text, fontSize: fonts.emphasized }]}>Delete Translation</Text>
            <Text style={[styles.deleteModalMessage, { color: colors.textSecondary, fontSize: fonts.primary }]}>
              Are you sure you want to remove this translation from your vocabulary?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalCancelButton, { backgroundColor: colors.surfaceTransparent }]}
                onPress={cancelDeleteWord}
              >
                <Text style={[styles.deleteModalCancelText, { color: colors.text, fontSize: fonts.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteWord}
              >
                <Text style={[styles.deleteModalConfirmText, { fontSize: fonts.primary }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear All Vocabulary Confirmation Modal */}
      <Modal
        visible={showClearAllModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelClearAllVocabulary}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.deleteModalTitle, { color: colors.text, fontSize: fonts.emphasized }]}>Clear All Vocabulary</Text>
            <Text style={[styles.deleteModalMessage, { color: colors.textSecondary, fontSize: fonts.primary }]}>
              Are you sure you want to delete all vocabulary words? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalCancelButton, { backgroundColor: colors.surfaceTransparent }]}
                onPress={cancelClearAllVocabulary}
              >
                <Text style={[styles.deleteModalCancelText, { color: colors.text, fontSize: fonts.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmClearAllVocabulary}
              >
                <Text style={[styles.deleteModalConfirmText, { fontSize: fonts.primary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    // Dynamic in usage
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
  clearAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  wordContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
    fontWeight: '500',
  },
  wordHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateAdded: {
    // Dynamic in usage
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
    fontWeight: '500',
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginHorizontal: 1,
    marginVertical: 1,
    borderWidth: 1,
  },
  interactiveWord: {
    lineHeight: 20,
    fontWeight: '500',
  },
  wordSpace: {
    lineHeight: 20,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  deleteModalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  deleteModalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalMessage: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: '#FFF',
    fontWeight: '600',
  },
});