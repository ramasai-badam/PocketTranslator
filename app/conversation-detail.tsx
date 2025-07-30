import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, Trash2, User, BookmarkPlus, Bookmark } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { TranslationHistoryManager, TranslationEntry } from '../utils/TranslationHistory';
import { TTSVoiceManager } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';
import { VocabularyManager } from '../utils/VocabularyManager';

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams();
  const languagePair = params.languagePair as string;
  const displayName = params.displayName as string;
  const dateFilter = params.dateFilter as string;
  const highlightTranslationId = params.highlightTranslationId as string;
  const searchQuery = params.searchQuery as string;
  
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const scrollViewRef = useRef<ScrollView>(null);
  const entryPositions = useRef<{ [key: string]: number }>({});
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
      
      // Animate highlight in - run animations separately to avoid driver conflicts
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false, // Color animations don't support native driver
      }).start();
      
      Animated.sequence([
        Animated.timing(highlightScale, {
          toValue: 1.02,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(highlightScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Scroll to the highlighted entry after a short delay to ensure rendering is complete
      setTimeout(() => {
        const entryY = entryPositions.current[highlightTranslationId];
        if (entryY !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ 
            y: Math.max(0, entryY - 100), // Offset by 100px to show some context above
            animated: true 
          });
        } else {
          // Fallback: scroll to estimated position based on entry index
          const entryIndex = entries.findIndex(entry => entry.id === highlightTranslationId);
          if (entryIndex !== -1) {
            const estimatedY = entryIndex * 200; // Estimate 200px per entry
            scrollViewRef.current?.scrollTo({ 
              y: Math.max(0, estimatedY - 100), 
              animated: true 
            });
          }
        }
      }, 500); // Increased delay to allow layout to complete
      
      // Remove highlight after 3 seconds with smooth fade out
      const timeout = setTimeout(() => {
        Animated.timing(borderColorAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false, // Color animations don't support native driver
        }).start();
        
        Animated.timing(highlightScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start((finished) => {
          // Only clear the highlighted entry ID after animation completes
          if (finished) {
            setHighlightedEntryId(null);
          }
        });
      }, 3000);
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
        setEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Failed to load conversation entries:', error);
      Alert.alert('Error', 'Failed to load conversation details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
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
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversation...</Text>
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
          <Text style={styles.headerTitle}>{displayName}</Text>
          <Text style={styles.headerSubtitle}>
            {entries.length} translation{entries.length !== 1 ? 's' : ''}
            {searchQuery && searchQuery.trim() !== '' && ` • Search: "${searchQuery}"`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearConversation}
          disabled={entries.length === 0}
        >
          <Trash2 size={20} color={entries.length > 0 ? "#FF3B30" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Conversation Entries */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Translations Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start using the translator to build your conversation history
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <Animated.View 
              key={entry.id} 
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                entryPositions.current[entry.id] = y;
              }}
              style={[
                styles.entryContainer,
                {
                  borderColor: highlightedEntryId === entry.id 
                    ? borderColorAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['#333', '#FFFFFF'],
                      })
                    : '#333',
                  borderWidth: 2, // Always 2px to avoid layout shift
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { 
                      scale: highlightedEntryId === entry.id 
                        ? highlightScale 
                        : 1
                    }
                  ],
                }}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.speakerInfo}>
                    <Text style={styles.speakerIcon}>{getSpeakerIcon(entry.speaker)}</Text>
                    <Text style={[styles.speakerLabel, { color: getSpeakerColor(entry.speaker) }]}>
                      {entry.speaker === 'user1' ? 'Speaker 1' : 'Speaker 2'}
                    </Text>
                  </View>
                  
                  <View style={styles.entryHeaderRight}>
                    <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
                    <TouchableOpacity
                      style={styles.addToVocabButton}
                      onPress={() => handleAddToVocabulary(entry)}
                    >
                      {savedEntries.has(entry.id) ? (
                        <Bookmark size={16} color="#34C759" />
                      ) : (
                        <Bookmark size={16} color="#FF3B30" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTranslation(entry.id)}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Original Text */}
                <View style={[styles.textContainer, styles.originalTextContainer]}>
                  <View style={styles.textHeader}>
                    <Text style={styles.languageLabel}>
                      {getLanguageDisplayName(entry.fromLanguage)}
                    </Text>
                    <View style={styles.textActions}>
                      <TouchableOpacity
                        style={styles.speakButton}
                        onPress={() => handleSpeak(entry.originalText, entry.fromLanguage)}
                      >
                        <Volume2 size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.originalText}>{entry.originalText}</Text>
                </View>

                {/* Translation */}
                <View style={[styles.textContainer, styles.translatedTextContainer]}>
                  <View style={styles.textHeader}>
                    <Text style={styles.languageLabel}>
                      {getLanguageDisplayName(entry.toLanguage)}
                    </Text>
                    <TouchableOpacity
                      style={styles.speakButton}
                      onPress={() => handleSpeak(entry.translatedText, entry.toLanguage)}
                    >
                      <Volume2 size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.translatedText}>{entry.translatedText}</Text>
                </View>
              </Animated.View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {entries.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
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
  clearButton: {
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
  entryContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2, // Always 2px to match highlighted state
    borderColor: '#333',
  },
  entryContainerHighlighted: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#FFF',
    borderWidth: 2,
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
    color: '#999',
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
    fontSize: 12,
    color: '#999',
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
    fontSize: 16,
    color: '#FFF',
    lineHeight: 22,
  },
  translatedText: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 22,
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
});