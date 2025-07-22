import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MessageCircle, Trash2, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { TranslationHistoryManager, LanguagePairConversation, TranslationEntry } from '../utils/TranslationHistory';

export default function HistoryScreen() {
  const [translationsByDay, setTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [filteredTranslationsByDay, setFilteredTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTranslations();
  }, []);

  // Filter translations when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranslationsByDay(translationsByDay);
      return;
    }

    const filtered: typeof translationsByDay = {};
    const query = searchQuery.toLowerCase();

    Object.keys(translationsByDay).forEach(dateKey => {
      Object.keys(translationsByDay[dateKey]).forEach(languagePair => {
        const { conversation, entries } = translationsByDay[dateKey][languagePair];
        
        // Filter entries that match search query
        const matchingEntries = entries.filter(entry => 
          entry.originalText.toLowerCase().includes(query) ||
          entry.translatedText.toLowerCase().includes(query) ||
          conversation.displayName.toLowerCase().includes(query)
        );

        if (matchingEntries.length > 0) {
          if (!filtered[dateKey]) {
            filtered[dateKey] = {};
          }
          filtered[dateKey][languagePair] = {
            conversation,
            entries: matchingEntries
          };
        }
      });
    });

    setFilteredTranslationsByDay(filtered);
  }, [searchQuery, translationsByDay]);

  const loadTranslations = async () => {
    try {
      const convs = await TranslationHistoryManager.getTranslationsByDay();
      setTranslationsByDay(convs);
    } catch (error) {
      console.error('Failed to load translations:', error);
      Alert.alert('Error', 'Failed to load translation history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTranslations();
  };

  const handleConversationPress = (conversation: LanguagePairConversation) => {
    // Navigate to conversation detail screen
    router.push({
      pathname: '/conversation-detail',
      params: {
        languagePair: conversation.languagePair,
        displayName: conversation.displayName,
      },
    });
  };

  const handleDeleteTranslation = (translationId: string) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this translation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TranslationHistoryManager.deleteTranslation(translationId);
              await loadTranslations(); // Reload data
              Alert.alert('Success', 'Translation deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete translation');
            }
          },
        },
      ]
    );
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all translation history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await TranslationHistoryManager.clearAllHistory();
              setTranslationsByDay({});
              Alert.alert('Success', 'All translation history has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTotalTranslations = () => {
    return Object.values(filteredTranslationsByDay).reduce((total, dayData) => {
      return total + Object.values(dayData).reduce((dayTotal, { entries }) => dayTotal + entries.length, 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
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
        <Text style={styles.headerTitle}>Translation History</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAllHistory}
          disabled={Object.keys(translationsByDay).length === 0}
        >
          <Trash2 size={20} color={Object.keys(translationsByDay).length > 0 ? "#FF3B30" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search translations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <X size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Translations by Day */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(filteredTranslationsByDay).length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#666" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching translations' : 'No Translation History'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Start translating to build your learning history'}
            </Text>
          </View>
        ) : (
          // Sort dates (newest first)
          Object.keys(filteredTranslationsByDay)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((dateKey) => (
              <View key={dateKey} style={styles.daySection}>
                {/* Day Header */}
                <Text style={styles.dayHeader}>{formatDateHeader(dateKey)}</Text>
                
                {/* Language Pairs for this day */}
                {Object.keys(filteredTranslationsByDay[dateKey]).map((languagePair) => {
                  const { conversation, entries } = filteredTranslationsByDay[dateKey][languagePair];
                  return (
                    <View key={`${dateKey}-${languagePair}`} style={styles.languagePairSection}>
                      {/* Language Pair Header */}
                      <TouchableOpacity
                        style={styles.languagePairHeader}
                        onPress={() => handleConversationPress(conversation)}
                      >
                        <Text style={styles.languagePairTitle}>
                          {conversation.displayName}
                        </Text>
                        <View style={styles.languagePairInfo}>
                          <Text style={styles.entryCount}>
                            {entries.length} translation{entries.length !== 1 ? 's' : ''}
                          </Text>
                          <Text style={styles.arrowText}>›</Text>
                        </View>
                      </TouchableOpacity>
                      
                      {/* Individual Translations */}
                      {entries.slice(0, 3).map((entry) => (
                        <View key={entry.id} style={styles.translationItem}>
                          <View style={styles.translationContent}>
                            <Text style={styles.originalText} numberOfLines={1}>
                              {entry.originalText}
                            </Text>
                            <Text style={styles.translatedText} numberOfLines={1}>
                              {entry.translatedText}
                            </Text>
                            <Text style={styles.translationTime}>
                              {formatDate(entry.timestamp)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteTranslation(entry.id)}
                          >
                            <Trash2 size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      
                      {entries.length > 3 && (
                        <TouchableOpacity
                          style={styles.viewMoreButton}
                          onPress={() => handleConversationPress(conversation)}
                        >
                          <Text style={styles.viewMoreText}>
                            View {entries.length - 3} more translation{entries.length - 3 !== 1 ? 's' : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
        )}
      </ScrollView>

      {Object.keys(filteredTranslationsByDay).length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tip: Tap any conversation to review and practice your translations
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  mostUsedContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  mostUsedText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  languagePairSection: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  languagePairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languagePairTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  languagePairInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryCount: {
    fontSize: 12,
    color: '#999',
  },
  translationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  translationContent: {
    flex: 1,
  },
  originalText: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 4,
  },
  translatedText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  translationTime: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  viewMoreButton: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  arrowText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
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
  }
});