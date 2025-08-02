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

// Extend global type for caching
declare global {
  var lastBreakdownData: { cacheKey: string; data: any } | null;
}

// Combined interface for vocabulary items with translation data
interface VocabularyItem {
  vocabularyEntry: VocabularyEntry;
  translationEntry: TranslationEntry | null;
}

// Memoized vocabulary item component
const VocabularyItem = memo(({ item, onDelete, onBreakdown, isBreakdownCached, renderInteractiveText }: {
  item: VocabularyItem;
  onDelete: (id: string) => void;
  onBreakdown: (item: VocabularyItem) => void;
  isBreakdownCached: (item: VocabularyItem) => boolean;
  renderInteractiveText: (text: string, languageCode: string) => React.ReactNode;
}) => {
  if (!item.translationEntry) return null;
  
  const { vocabularyEntry, translationEntry } = item;
  
  return (
    <View style={styles.wordContainer}>
      <View style={styles.wordHeader}>
        <View style={styles.languageInfo}>
          <Text style={styles.languageLabel}>
            {getLanguageDisplayName(translationEntry.fromLanguage)} → {getLanguageDisplayName(translationEntry.toLanguage)}
          </Text>
        </View>
        
        <View style={styles.wordHeaderRight}>
          <Text style={styles.dateAdded}>{vocabularyEntry.dateAdded}</Text>
          <TouchableOpacity
            style={styles.breakdownButton}
            onPress={() => onBreakdown(item)}
          >
            <GraduationCap 
              size={16} 
              color={isBreakdownCached(item) ? "#FFD700" : "#34C759"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(vocabularyEntry.translationId)}
          >
            <Trash2 size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Original Text */}
      <View style={[styles.textContainer, styles.originalTextContainer]}>
        <View style={styles.textHeader}>
          <Text style={styles.textLabel}>Original</Text>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => Speech.speak(translationEntry.originalText, { language: translationEntry.fromLanguage })}
          >
            <Volume2 size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {renderInteractiveText(translationEntry.originalText, translationEntry.fromLanguage)}
      </View>

      {/* Translation */}
      <View style={[styles.textContainer, styles.translatedTextContainer]}>
        <View style={styles.textHeader}>
          <Text style={styles.textLabel}>Translation</Text>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => Speech.speak(translationEntry.translatedText, { language: translationEntry.toLanguage })}
          >
            <Volume2 size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {renderInteractiveText(translationEntry.translatedText, translationEntry.toLanguage)}
      </View>
    </View>
  );
});

// Empty state component
const EmptyComponent = memo(() => (
  <View style={styles.emptyContainer}>
    <BookOpen size={48} color="#666" />
    <Text style={styles.emptyTitle}>No Vocabulary Words Yet</Text>
    <Text style={styles.emptySubtitle}>
      Add words from your translation history to start building your vocabulary
    </Text>
  </View>
));

// Loading footer component
const LoadingFooter = memo(() => (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <Text style={styles.loadingText}>Loading more...</Text>
  </View>
));


export default function VocabularyListScreen() {
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [breakdownCache, setBreakdownCache] = useState<{ [key: string]: any }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Simple pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Key for AsyncStorage
  const BREAKDOWN_CACHE_KEY = 'linguisticBreakdownCache';

  useEffect(() => {
    loadVocabularyItems();
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

  const handleLinguisticBreakdown = (item: VocabularyItem) => {
    if (!item.translationEntry) return;
    
    const { translationEntry } = item;
    // Create a unique cache key for this translation pair
    const cacheKey = `${translationEntry.originalText}_${translationEntry.fromLanguage}_${translationEntry.toLanguage}`;
    
    // Check if we have cached breakdown data
    const cachedBreakdown = breakdownCache[cacheKey];
    
    if (cachedBreakdown) {
      // Use cached data - navigate directly with the cached breakdown
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
          cachedData: JSON.stringify(cachedBreakdown),
        }
      });
    } else {
      // No cached data - navigate normally (will trigger API call)
      router.push({
        pathname: '/linguistic-breakdown',
        params: {
          originalText: translationEntry.originalText,
          translatedText: translationEntry.translatedText,
          originalLanguage: translationEntry.fromLanguage,
          translatedLanguage: translationEntry.toLanguage,
        }
      });
    }
  };

  const isBreakdownCached = (item: VocabularyItem) => {
    if (!item.translationEntry) return false;
    
    const { translationEntry } = item;
    const cacheKey = `${translationEntry.originalText}_${translationEntry.fromLanguage}_${translationEntry.toLanguage}`;
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
            {vocabularyItems.length} word{vocabularyItems.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAllVocabulary}
          disabled={vocabularyItems.length === 0}
        >
          <Trash2 size={20} color={vocabularyItems.length > 0 ? "#FF3B30" : "#666"} />
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
            isBreakdownCached={isBreakdownCached}
            renderInteractiveText={renderInteractiveText}
          />
        )}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyComponent />}
        ListFooterComponent={loadingMore ? <LoadingFooter /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {vocabularyItems.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tap words to hear pronunciation • 🎓 Green: fresh analysis, Gold: cached analysis
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
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Translation</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to remove this translation from your vocabulary?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteWord}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteWord}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
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
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Clear All Vocabulary</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete all vocabulary words? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelClearAllVocabulary}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmClearAllVocabulary}
              >
                <Text style={styles.deleteModalConfirmText}>Clear All</Text>
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  deleteModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#999',
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
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#FFF',
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
});