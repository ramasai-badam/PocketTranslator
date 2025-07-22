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
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MessageCircle, Trash2, Search, X, Filter, Calendar, Languages } from 'lucide-react-native';
import { router } from 'expo-router';
import { TranslationHistoryManager, LanguagePairConversation, TranslationEntry } from '../utils/TranslationHistory';
import { SUPPORTED_LANGUAGES, getLanguageDisplayName } from '../utils/LanguageConfig';

export default function HistoryScreen() {
  const [translationsByDay, setTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [filteredTranslationsByDay, setFilteredTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [languagePairFilter, setLanguagePairFilter] = useState<string>('all');
  const [availableLanguagePairs, setAvailableLanguagePairs] = useState<string[]>([]);

  useEffect(() => {
    loadTranslations();
  }, []);

  // Filter translations when search query or filters change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, translationsByDay, dateFilter, languagePairFilter]);

  const applyFilters = () => {
    const filtered: typeof translationsByDay = {};
    const query = searchQuery.toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    Object.keys(translationsByDay).forEach(dateKey => {
      // Apply date filter
      const entryDate = new Date(dateKey);
      if (dateFilter === 'today' && entryDate.getTime() !== today.getTime()) return;
      if (dateFilter === 'week' && entryDate < weekAgo) return;
      if (dateFilter === 'month' && entryDate < monthAgo) return;

      Object.keys(translationsByDay[dateKey]).forEach(languagePair => {
        const { conversation, entries } = translationsByDay[dateKey][languagePair];
        
        // Apply language pair filter
        if (languagePairFilter !== 'all' && languagePair !== languagePairFilter) return;

        // Apply search query filter
        const matchingEntries = entries.filter(entry => {
          if (!query) return true;
          return entry.originalText.toLowerCase().includes(query) ||
                 entry.translatedText.toLowerCase().includes(query) ||
                 conversation.displayName.toLowerCase().includes(query);
        });

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
  };

  const getAvailableLanguagePairs = (translations: typeof translationsByDay): string[] => {
    const pairs = new Set<string>();
    Object.values(translations).forEach(dayData => {
      Object.keys(dayData).forEach(languagePair => {
        pairs.add(languagePair);
      });
    });
    return Array.from(pairs);
  };

  const getLanguagePairDisplayName = (languagePair: string): string => {
    const [lang1, lang2] = languagePair.split('-');
    const name1 = getLanguageDisplayName(lang1);
    const name2 = getLanguageDisplayName(lang2);
    return `${name1} ↔ ${name2}`;
  };

  const getDateFilterLabel = (filter: string): string => {
    switch (filter) {
      case 'today': return 'Today';
      case 'week': return 'Past Week';
      case 'month': return 'Past Month';
      default: return 'All Time';
    }
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (dateFilter !== 'all') count++;
    if (languagePairFilter !== 'all') count++;
    return count;
  };

  const clearAllFilters = () => {
    setDateFilter('all');
    setLanguagePairFilter('all');
    setSearchQuery('');
  };

  const loadTranslations = async () => {
    try {
      const convs = await TranslationHistoryManager.getTranslationsByDay();
      setTranslationsByDay(convs);
      
      // Extract available language pairs for filter
      const pairs = getAvailableLanguagePairs(convs);
      setAvailableLanguagePairs(pairs);
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
              setAvailableLanguagePairs([]);
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

      {/* Search and Filter */}
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
        
        <TouchableOpacity
          style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color={getActiveFiltersCount() > 0 ? "#007AFF" : "#999"} />
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            {dateFilter !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Calendar size={14} color="#007AFF" />
                <Text style={styles.activeFilterText}>{getDateFilterLabel(dateFilter)}</Text>
                <TouchableOpacity onPress={() => setDateFilter('all')}>
                  <X size={14} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
            {languagePairFilter !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Languages size={14} color="#007AFF" />
                <Text style={styles.activeFilterText}>{getLanguagePairDisplayName(languagePairFilter)}</Text>
                <TouchableOpacity onPress={() => setLanguagePairFilter('all')}>
                  <X size={14} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Translations</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Date Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              {['all', 'today', 'week', 'month'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterOption, dateFilter === filter && styles.filterOptionActive]}
                  onPress={() => setDateFilter(filter as any)}
                >
                  <Calendar size={20} color={dateFilter === filter ? "#007AFF" : "#999"} />
                  <Text style={[styles.filterOptionText, dateFilter === filter && styles.filterOptionTextActive]}>
                    {getDateFilterLabel(filter)}
                  </Text>
                  {dateFilter === filter && <View style={styles.filterOptionCheck} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Language Pair Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Language Pairs</Text>
              <TouchableOpacity
                style={[styles.filterOption, languagePairFilter === 'all' && styles.filterOptionActive]}
                onPress={() => setLanguagePairFilter('all')}
              >
                <Languages size={20} color={languagePairFilter === 'all' ? "#007AFF" : "#999"} />
                <Text style={[styles.filterOptionText, languagePairFilter === 'all' && styles.filterOptionTextActive]}>
                  All Language Pairs
                </Text>
                {languagePairFilter === 'all' && <View style={styles.filterOptionCheck} />}
              </TouchableOpacity>
              {availableLanguagePairs.map((pair) => (
                <TouchableOpacity
                  key={pair}
                  style={[styles.filterOption, languagePairFilter === pair && styles.filterOptionActive]}
                  onPress={() => setLanguagePairFilter(pair)}
                >
                  <Languages size={20} color={languagePairFilter === pair ? "#007AFF" : "#999"} />
                  <Text style={[styles.filterOptionText, languagePairFilter === pair && styles.filterOptionTextActive]}>
                    {getLanguagePairDisplayName(pair)}
                  </Text>
                  {languagePairFilter === pair && <View style={styles.filterOptionCheck} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
              <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              {searchQuery || getActiveFiltersCount() > 0 ? 'No matching translations' : 'No Translation History'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || getActiveFiltersCount() > 0 ? 'Try adjusting your search or filters' : 'Start translating to build your learning history'}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  filterOptionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  clearAllButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
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
  },
});