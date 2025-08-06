import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Modal,
  ListRenderItem,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, Trash2, User, Bookmark } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { TranslationHistoryManager, TranslationEntry } from '../utils/TranslationHistory';
import { TTSVoiceManager } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';
import { VocabularyManager } from '../utils/VocabularyManager';
import { useTheme } from '../contexts/ThemeContext';
import { useTextSize } from '../hooks/useTextSize';

export default function ConversationDetailScreen() {
  const { colors } = useTheme();
  const { getTextSizeConfig } = useTextSize();
  const textSizeConfig = getTextSizeConfig();
  const scale = textSizeConfig.fontSize / 16; // Base scale on medium (16px)
  
  const params = useLocalSearchParams();
  const languagePair = params.languagePair as string;
  const displayName = params.displayName as string;
  const dateFilter = params.dateFilter as string;
  const highlightTranslationId = params.highlightTranslationId as string;
  const searchQuery = params.searchQuery as string;
  
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TranslationEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const ITEMS_PER_PAGE = 20;
  const [refreshing, setRefreshing] = useState(false);
  const [savedEntries, setSavedEntries] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [toastOpacity] = useState(new Animated.Value(0));
  const [toastTranslateY] = useState(new Animated.Value(-50));
  const [toastTimeoutRef, setToastTimeoutRef] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [highlightOpacity] = useState(new Animated.Value(0));
  const [highlightScale] = useState(new Animated.Value(1));
  const [borderColorAnim] = useState(new Animated.Value(0));
  const flatListRef = useRef<FlatList>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'translation' | 'conversation'; id?: string } | null>(null);

  useEffect(() => {
    loadConversationEntries();
  }, [languagePair]);

  useEffect(() => {
    if (entries.length > 0) {
      checkSavedEntries();
    }
  }, [entries]);

  // Handle highlighting specific translation
  useEffect(() => {
    if (highlightTranslationId && entries.length > 0) {
      setHighlightedEntryId(highlightTranslationId);
      
      // Find the entry index first
      const entryIndex = entries.findIndex(entry => entry.id === highlightTranslationId);
      
      if (entryIndex !== -1) {
        // Scroll to the item first with a shorter delay
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({ 
              index: entryIndex,
              animated: true,
              viewOffset: 100,
              viewPosition: 0.3
            });
          } catch (error) {
            // Fallback: Use estimated offset calculation
            const estimatedItemHeight = 200;
            const estimatedOffset = Math.max(0, (entryIndex * estimatedItemHeight) - 100);
            
            flatListRef.current?.scrollToOffset({ 
              offset: estimatedOffset,
              animated: true 
            });
          }
        }, 100);
        
        // Start animations after scroll begins
        setTimeout(() => {
          // Smooth border color animation
          Animated.timing(borderColorAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }).start();
          
          // Smooth scale animation with easing
          Animated.sequence([
            Animated.timing(highlightScale, {
              toValue: 1.03,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(highlightScale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        }, 200);
      }
      
      // Remove highlight after 3.5 seconds
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(borderColorAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(highlightScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start((finished) => {
          if (finished) {
            setHighlightedEntryId(null);
          }
        });
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [highlightTranslationId, entries]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef) {
        clearTimeout(toastTimeoutRef);
      }
    };
  }, [toastTimeoutRef]);

  const checkSavedEntries = async () => {
    try {
      const vocabularyIds = await VocabularyManager.getVocabularyTranslationIds();
      const savedSet = new Set<string>();
      
      entries.forEach(entry => {
        if (vocabularyIds.includes(entry.id)) {
          savedSet.add(entry.id);
        }
      });
      
      setSavedEntries(savedSet);
    } catch (error) {
      console.error('Failed to check saved entries:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Clear any existing timeout to prevent overlapping animations
    if (toastTimeoutRef) {
      clearTimeout(toastTimeoutRef);
      setToastTimeoutRef(null);
    }

    setToastMessage(message);
    setToastType(type);
    
    // Animate in with both opacity and transform
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Set timeout for fade out after animation completes
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: -50,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Clear message after fade out completes
          setToastMessage('');
          setToastTimeoutRef(null);
        });
      }, 2500);
      
      setToastTimeoutRef(timeout);
    });
  };

  const loadConversationEntries = async () => {
    try {
      if (!languagePair) return;
      
      // Parse language pair (e.g., "en-es" -> ["en", "es"])
      const [lang1, lang2] = languagePair.split('-');
      const conversation = await TranslationHistoryManager.getConversation(lang1, lang2);
      
      if (conversation) {
        let filteredEntries = conversation.entries;
        
        // Apply date filter if provided
        if (dateFilter && dateFilter !== '' && dateFilter !== 'all') {
          if (dateFilter.includes('_to_')) {
            // Handle date range filter (e.g., "Mon Jan 27 2025_to_Tue Jan 28 2025")
            const [startDateStr, endDateStr] = dateFilter.split('_to_');
            const startTime = new Date(startDateStr).getTime();
            const endTime = new Date(endDateStr).getTime();
            
            filteredEntries = conversation.entries.filter(entry => {
              const entryTime = entry.timestamp;
              return entryTime >= startTime && entryTime <= (endTime + 24 * 60 * 60 * 1000 - 1); // Include full end day
            });
          } else {
            // Handle single date filter (e.g., "Mon Jan 27 2025")
            const filterDate = new Date(dateFilter);
            const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate()).getTime();
            const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
            
            filteredEntries = conversation.entries.filter(entry => {
              const entryTime = entry.timestamp;
              return entryTime >= startOfDay && entryTime <= endOfDay;
            });
          }
        }
        
        // Apply search filter if provided
        if (searchQuery && searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          filteredEntries = filteredEntries.filter(entry =>
            entry.originalText.toLowerCase().includes(query) ||
            entry.translatedText.toLowerCase().includes(query)
          );
        }
        
        // Sort entries by timestamp (newest first)
        const sortedEntries = filteredEntries.sort((a, b) => b.timestamp - a.timestamp);
        
        // Store all entries and display first page
        setAllEntries(sortedEntries);
        setEntries(sortedEntries.slice(0, ITEMS_PER_PAGE));
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to load conversation entries:', error);
      Alert.alert('Error', 'Failed to load conversation details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || entries.length >= allEntries.length) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * ITEMS_PER_PAGE;
      const newEntries = allEntries.slice(startIndex, endIndex);
      
      setEntries(newEntries);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    }, 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadConversationEntries();
  };

  const handleSpeak = async (text: string, language: string) => {
    if (!text) return;
    
    try {
      // Check if TTS voice is available for this language
      const isVoiceAvailable = await TTSVoiceManager.canSpeakLanguage(language);
      
      if (!isVoiceAvailable) {
        const languageName = getLanguageDisplayName(language);
        Alert.alert(
          'TTS Voice Not Available',
          `Text-to-speech voice for ${languageName} is not available. Would you like to enable it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: () => router.push('/settings')
            }
          ]
        );
        return;
      }

      Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
      });
    } catch (error) {
      console.error('Failed to speak text:', error);
      // Fallback to speaking without language check
      Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const handleAddToVocabulary = async (entry: TranslationEntry) => {
    try {
      const isCurrentlySaved = savedEntries.has(entry.id);
      
      if (isCurrentlySaved) {
        // Remove from vocabulary
        const result = await VocabularyManager.removeFromVocabulary(entry.id);
        
        // Update UI state immediately
        setSavedEntries(prev => {
          const newSet = new Set(prev);
          newSet.delete(entry.id);
          return newSet;
        });
        
        if (result.success) {
          showToast('Removed from vocabulary!', 'error');
        } else {
          showToast('Removed from vocabulary!', 'error'); // Show error anyway for UI consistency
        }
      } else {
        // Add to vocabulary
        const result = await VocabularyManager.addToVocabulary(entry.id);

        if (result.success) {
          // Only update UI state if successfully saved
          setSavedEntries(prev => new Set(prev).add(entry.id));
          showToast('Added to vocabulary!', 'success');
        } else if (result.isDuplicate) {
          // If it's a duplicate, mark as saved in UI
          setSavedEntries(prev => new Set(prev).add(entry.id));
          showToast('Already in vocabulary!', 'warning');
        } else {
          showToast('Failed to add to vocabulary', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to toggle vocabulary:', error);
      showToast('Failed to update vocabulary', 'error');
    }
  };

  const handleDeleteTranslation = (translationId: string) => {
    setDeleteTarget({ type: 'translation', id: translationId });
    setShowDeleteModal(true);
  };

  const handleClearConversation = () => {
    setDeleteTarget({ type: 'conversation' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'translation' && deleteTarget.id) {
        await TranslationHistoryManager.deleteTranslation(deleteTarget.id);
        // Remove the deleted entry from the current entries
        setEntries(prevEntries => prevEntries.filter(entry => entry.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'conversation') {
        const [lang1, lang2] = languagePair.split('-');
        await TranslationHistoryManager.clearConversation(lang1, lang2);
        setEntries([]);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('Failed to delete', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Memoized render item for FlatList
  const renderItem: ListRenderItem<TranslationEntry> = useCallback(({ item: entry }) => (
    <Animated.View 
      key={entry.id} 
      style={[
        styles.entryContainer,
        {
          backgroundColor: colors.surface,
          borderColor: highlightedEntryId === entry.id 
            ? borderColorAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.border, '#007AFF'],
              })
            : colors.border,
          borderWidth: highlightedEntryId === entry.id ? 3 : 2,
          transform: highlightedEntryId === entry.id ? [{ scale: highlightScale }] : [],
          shadowOpacity: highlightedEntryId === entry.id 
            ? borderColorAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15],
              })
            : 0,
          shadowRadius: highlightedEntryId === entry.id ? 8 : 0,
          shadowOffset: { width: 0, height: 2 },
          elevation: highlightedEntryId === entry.id ? 4 : 0,
        },
      ]}
    >
      <Animated.View
        style={{
          opacity: highlightedEntryId === entry.id 
            ? borderColorAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.98],
              })
            : 1,
        }}
      >
        <View style={styles.entryHeader}>
          <Text style={[styles.timestamp, { color: colors.textSecondary, fontSize: 12 * scale }]}>
            {new Date(entry.timestamp).toLocaleString()}
          </Text>
          <View style={styles.entryActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleAddToVocabulary(entry)}
            >
              <Bookmark size={16 * scale} color={savedEntries.has(entry.id) ? "#34C759" : "#FF3B30"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDeleteTranslation(entry.id)}
            >
              <Trash2 size={16 * scale} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.textContainer, styles.originalTextContainer]}>
          <View style={styles.textHeader}>
            <Text style={[styles.languageLabel, { color: colors.textSecondary, fontSize: 12 * scale }]}>
              {getLanguageDisplayName(entry.fromLanguage)}
            </Text>
            <View style={styles.textActions}>
              <TouchableOpacity
                style={styles.speakButton}
                onPress={() => handleSpeak(entry.originalText, entry.fromLanguage)}
              >
                <Volume2 size={16 * scale} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.originalText, { color: colors.text, fontSize: 16 * scale }]}>{entry.originalText}</Text>
        </View>

        <View style={[styles.textContainer, styles.translatedTextContainer]}>
          <View style={styles.textHeader}>
            <Text style={[styles.languageLabel, { color: colors.textSecondary, fontSize: 12 * scale }]}>
              {getLanguageDisplayName(entry.toLanguage)}
            </Text>
            <TouchableOpacity
              style={styles.speakButton}
              onPress={() => handleSpeak(entry.translatedText, entry.toLanguage)}
            >
              <Volume2 size={16 * scale} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.translatedText, { color: colors.text, fontSize: 16 * scale }]}>{entry.translatedText}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  ), [highlightedEntryId, borderColorAnim, savedEntries, handleAddToVocabulary, handleDeleteTranslation, handleSpeak, colors, scale]);

  // Memoized footer component
  const renderFooter = useCallback(() => {
    if (entries.length >= allEntries.length) {
      return entries.length > 0 ? (
        <View style={styles.endFooter}>
          <Text style={[styles.endText, { color: colors.textTertiary, fontSize: 14 * scale }]}>• • •</Text>
        </View>
      ) : null;
    }

    return loadingMore ? (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, { color: colors.text, fontSize: 16 * scale }]}>Loading more translations...</Text>
      </View>
    ) : null;
  }, [loadingMore, entries.length, allEntries.length, colors, scale]);

  // Memoized empty component
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <User size={48 * scale} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 20 * scale }]}>No Translations Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: 16 * scale }]}>
        Start using the translator to build your conversation history
      </Text>
    </View>
  ), [colors, scale]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSpeakerIcon = (speaker: 'user1' | 'user2') => {
    return speaker === 'user1' ? '👤' : '👥';
  };

  const getSpeakerColor = (speaker: 'user1' | 'user2') => {
    return speaker === 'user1' ? '#2563eb' : '#dc2626';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#1a1a1a' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text, fontSize: 16 * scale }]}>Loading conversation...</Text>
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
          <ArrowLeft size={24 * scale} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: 18 * scale }]}>{displayName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: 12 * scale }]}>
            {entries.length} translation{entries.length !== 1 ? 's' : ''}
            {searchQuery && searchQuery.trim() !== '' && ` • Search: "${searchQuery}"`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: colors.surfaceTransparent }]}
          onPress={handleClearConversation}
          disabled={entries.length === 0}
        >
          <Trash2 size={20 * scale} color={entries.length > 0 ? "#FF3B30" : colors.disabled} />
        </TouchableOpacity>
      </View>

      {/* Conversation Entries */}
      <FlatList
        ref={flatListRef}
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={false} // Disable to ensure all items are rendered for highlighting
        maxToRenderPerBatch={15}
        windowSize={15}
        initialNumToRender={15}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure with a fallback
          console.log('ScrollToIndex failed, using fallback for index:', info.index);
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ 
              index: Math.min(info.index, entries.length - 1), 
              animated: true,
              viewOffset: 100,
              viewPosition: 0.3
            });
          });
        }}
      />
        
      {entries.length > 0 && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: 14 * scale }]}>
            🔊 Tap the speaker icons to hear pronunciations and practice your listening skills
          </Text>
        </View>
      )}

      {/* Toast Message */}
      {toastMessage ? (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              backgroundColor: 
                toastType === 'success' ? '#34C759' :
                toastType === 'warning' ? '#FF9500' : '#FF3B30',
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>
              {deleteTarget?.type === 'translation' ? 'Delete Translation' : 'Clear Conversation'}
            </Text>
            <Text style={styles.deleteModalMessage}>
              {deleteTarget?.type === 'translation' 
                ? 'Are you sure you want to delete this translation? This action cannot be undone.'
                : `Are you sure you want to delete all translations for ${displayName}? This action cannot be undone.`
              }
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>
                  {deleteTarget?.type === 'translation' ? 'Delete' : 'Clear All'}
                </Text>
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
  clearButton: {
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
  entryContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  entryContainerHighlighted: {
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  speakerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  speakerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryTime: {
    fontSize: 12,
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
  textActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageLabel: {
    fontWeight: '500',
  },
  speakButton: {
    padding: 4,
  },
  addToVocabButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  originalText: {
    lineHeight: 22,
  },
  translatedText: {
    lineHeight: 22,
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
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toastText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
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
  // Additional styles for pagination
  timestamp: {
    marginBottom: 4,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    padding: 6,
    borderRadius: 6,
  },
  savedButton: {
    //
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endText: {
    //
  },
  iconButton: {
    padding: 4,
  },
  loadingText: {
    //
  },
});