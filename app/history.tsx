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
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MessageCircle, Trash2, Search, X, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { TranslationHistoryManager, LanguagePairConversation, TranslationEntry } from '../utils/TranslationHistory';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../utils/LanguageConfig';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const [translationsByDay, setTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [filteredTranslationsByDay, setFilteredTranslationsByDay] = useState<{ [date: string]: { [languagePair: string]: { conversation: LanguagePairConversation; entries: TranslationEntry[] } } }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [dateFilterMode, setDateFilterMode] = useState<'single' | 'range'>('single');
  const [selectedFromLanguage, setSelectedFromLanguage] = useState<string | null>(null);
  const [selectedToLanguage, setSelectedToLanguage] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(null);
  const [tempSelectedStartDate, setTempSelectedStartDate] = useState<string | null>(null);
  const [tempSelectedEndDate, setTempSelectedEndDate] = useState<string | null>(null);
  const [tempSelectedFromLanguage, setTempSelectedFromLanguage] = useState<string | null>(null);
  const [tempSelectedToLanguage, setTempSelectedToLanguage] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    loadTranslations();
  }, []);

  // Update available dates when translations change
  useEffect(() => {
    const dates = Object.keys(translationsByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    setAvailableDates(dates);
  }, [translationsByDay]);

  // Filter translations when search query, selected date, or language pair changes
  useEffect(() => {
    filterTranslations();
  }, [searchQuery, selectedDate, selectedStartDate, selectedEndDate, dateFilterMode, selectedFromLanguage, selectedToLanguage, translationsByDay]);

  const filterTranslations = () => {
    let filtered = { ...translationsByDay };
    
    // Filter by date(s) if selected
    if (dateFilterMode === 'single' && selectedDate) {
      filtered = selectedDate in filtered ? { [selectedDate]: filtered[selectedDate] } : {};
    } else if (dateFilterMode === 'range' && selectedStartDate && selectedEndDate) {
      const startTime = new Date(selectedStartDate).getTime();
      const endTime = new Date(selectedEndDate).getTime();
      const filteredByRange: typeof translationsByDay = {};
      
      Object.keys(filtered).forEach(dateKey => {
        const dateTime = new Date(dateKey).getTime();
        if (dateTime >= startTime && dateTime <= endTime) {
          filteredByRange[dateKey] = filtered[dateKey];
        }
      });
      
      filtered = filteredByRange;
    }

    // Filter by language pair if selected
    if (selectedFromLanguage && selectedToLanguage) {
      const filteredByLanguage: typeof translationsByDay = {};
      
      Object.keys(filtered).forEach(dateKey => {
        Object.keys(filtered[dateKey]).forEach(languagePair => {
          const { conversation, entries } = filtered[dateKey][languagePair];
          
          // Check if this conversation matches the selected language pair (bidirectional)
          const [lang1, lang2] = languagePair.split('-');
          const matchesLanguagePair = 
            (lang1 === selectedFromLanguage && lang2 === selectedToLanguage) ||
            (lang1 === selectedToLanguage && lang2 === selectedFromLanguage);
          
          if (matchesLanguagePair) {
            if (!filteredByLanguage[dateKey]) {
              filteredByLanguage[dateKey] = {};
            }
            filteredByLanguage[dateKey][languagePair] = { conversation, entries };
          }
        });
      });
      
      filtered = filteredByLanguage;
    } else if (selectedFromLanguage || selectedToLanguage) {
      const filteredByLanguage: typeof translationsByDay = {};
      
      Object.keys(filtered).forEach(dateKey => {
        Object.keys(filtered[dateKey]).forEach(languagePair => {
          const { conversation, entries } = filtered[dateKey][languagePair];
          
          // Check if this conversation includes the selected language
          const [lang1, lang2] = languagePair.split('-');
          const includesSelectedLanguage = 
            (selectedFromLanguage && (lang1 === selectedFromLanguage || lang2 === selectedFromLanguage)) ||
            (selectedToLanguage && (lang1 === selectedToLanguage || lang2 === selectedToLanguage));
          
          if (includesSelectedLanguage) {
            if (!filteredByLanguage[dateKey]) {
              filteredByLanguage[dateKey] = {};
            }
            filteredByLanguage[dateKey][languagePair] = { conversation, entries };
          }
        });
      });
      
      filtered = filteredByLanguage;
    }
    
    // Finally filter by search query
    if (!searchQuery.trim()) {
      setFilteredTranslationsByDay(filtered);
      return;
    }

    const searchFiltered: typeof translationsByDay = {};
    const query = searchQuery.toLowerCase();

    Object.keys(filtered).forEach(dateKey => {
      Object.keys(filtered[dateKey]).forEach(languagePair => {
        const { conversation, entries } = filtered[dateKey][languagePair];
        
        // Filter entries that match search query
        const matchingEntries = entries.filter(entry => 
          entry.originalText.toLowerCase().includes(query) ||
          entry.translatedText.toLowerCase().includes(query) ||
          conversation.displayName.toLowerCase().includes(query)
        );

        if (matchingEntries.length > 0) {
          if (!searchFiltered[dateKey]) {
            searchFiltered[dateKey] = {};
          }
          searchFiltered[dateKey][languagePair] = {
            conversation,
            entries: matchingEntries
          };
        }
      });
    });

    setFilteredTranslationsByDay(searchFiltered);
  };

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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate(null);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setDateFilterMode('single');
    setSelectedFromLanguage(null);
    setSelectedToLanguage(null);
    setTempSelectedDate(null);
    setTempSelectedStartDate(null);
    setTempSelectedEndDate(null);
    setTempSelectedFromLanguage(null);
    setTempSelectedToLanguage(null);
    setShowFilterModal(false);
    setShowCalendar(false);
  };

  const applyFilters = () => {
    setSelectedDate(tempSelectedDate);
    setSelectedStartDate(tempSelectedStartDate);
    setSelectedEndDate(tempSelectedEndDate);
    setSelectedFromLanguage(tempSelectedFromLanguage);
    setSelectedToLanguage(tempSelectedToLanguage);
    setShowFilterModal(false);
    setShowCalendar(false);
  };

  const hasActiveFilters = () => {
    return selectedDate || (selectedStartDate && selectedEndDate) || (selectedFromLanguage && selectedToLanguage);
  };

  const getTotalTranslations = () => {
    return Object.values(filteredTranslationsByDay).reduce((total, dayData) => {
      return total + Object.values(dayData).reduce((dayTotal, { entries }) => dayTotal + entries.length, 0);
    }, 0);
  };

  const getFilterSummary = () => {
    const parts = [];
    if (dateFilterMode === 'single' && selectedDate) {
      parts.push(formatDateHeader(selectedDate));
    } else if (dateFilterMode === 'range' && selectedStartDate && selectedEndDate) {
      parts.push(`${formatDateHeader(selectedStartDate)} - ${formatDateHeader(selectedEndDate)}`);
    }
    if (selectedFromLanguage && selectedToLanguage) {
      const fromLang = getLanguageByCode(selectedFromLanguage);
      const toLang = getLanguageByCode(selectedToLanguage);
      parts.push(`${fromLang?.nativeName} ↔ ${toLang?.nativeName}`);
    }
    return parts.join(' • ');
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const isDateInRange = (date: Date) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    const dateTime = date.getTime();
    const startTime = new Date(selectedStartDate).getTime();
    const endTime = new Date(selectedEndDate).getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  const isDateSelected = (date: Date) => {
    const dateString = date.toDateString();
    if (dateFilterMode === 'single') {
      return selectedDate === dateString;
    } else {
      return dateString === selectedStartDate || dateString === selectedEndDate;
    }
  };

  const hasTranslationsOnDate = (date: Date) => {
    return availableDates.includes(date.toDateString());
  };

  const handleCalendarDatePress = (date: Date) => {
    const dateString = date.toDateString();
    
    if (dateFilterMode === 'single') {
      setTempSelectedDate(dateString);
      setShowCalendar(false);
    } else {
      if (!tempSelectedStartDate || (tempSelectedStartDate && tempSelectedEndDate)) {
        // Start new range
        setTempSelectedStartDate(dateString);
        setTempSelectedEndDate(null);
      } else {
        // Complete range
        const startTime = new Date(tempSelectedStartDate).getTime();
        const endTime = date.getTime();
        
        if (endTime >= startTime) {
          setTempSelectedEndDate(dateString);
        } else {
          setTempSelectedStartDate(dateString);
          setTempSelectedEndDate(tempSelectedStartDate);
        }
      }
    }
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
              onPress={clearFilters}
            >
              <X size={16} color="#999" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterButton, selectedDate && styles.filterButtonActive]}
            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color={hasActiveFilters() ? "#007AFF" : "#999"} />
          </TouchableOpacity>
        </View>
        
        {/* Active Filters Indicator */}
        {hasActiveFilters() && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersText}>
              Filters: {getFilterSummary()}
            </Text>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <X size={14} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Translations</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Date Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Filter by Date</Text>
                
                {/* Date Filter Mode Toggle */}
                <View style={styles.dateFilterModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterModeButton,
                      dateFilterMode === 'single' && styles.dateFilterModeButtonActive
                    ]}
                    onPress={() => {
                      setDateFilterMode('single');
                      setSelectedStartDate(null);
                      setSelectedEndDate(null);
                    }}
                  >
                    <Text style={[
                      styles.dateFilterModeText,
                      dateFilterMode === 'single' && styles.dateFilterModeTextActive
                    ]}>
                      Single Date
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterModeButton,
                      dateFilterMode === 'range' && styles.dateFilterModeButtonActive
                    ]}
                    onPress={() => {
                      setDateFilterMode('range');
                      setSelectedDate(null);
                    }}
                  >
                    <Text style={[
                      styles.dateFilterModeText,
                      dateFilterMode === 'range' && styles.dateFilterModeTextActive
                    ]}>
                      Date Range
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Calendar Toggle Button */}
                <TouchableOpacity
                  style={styles.calendarToggleBanner}
                  onPress={() => setShowCalendar(!showCalendar)}
                >
                  <View style={styles.calendarBannerContent}>
                    <Calendar size={20} color="#007AFF" />
                    <Text style={styles.calendarBannerText}>
                      {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                    </Text>
                  </View>
                  <Text style={styles.calendarBannerArrow}>
                    {showCalendar ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {/* Calendar */}
                {showCalendar && (
                  <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity
                        style={styles.calendarNavButton}
                        onPress={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarDate(newDate);
                        }}
                      >
                        <ChevronLeft size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <Text style={styles.calendarHeaderText}>
                        {calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                      </Text>
                      <TouchableOpacity
                        style={styles.calendarNavButton}
                        onPress={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarDate(newDate);
                        }}
                      >
                        <ChevronRight size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.calendarWeekDays}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
                      ))}
                    </View>
                    
                    <View style={styles.calendarGrid}>
                      {generateCalendarDays(calendarDate).map((date, index) => {
                        const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                        const isSelected = dateFilterMode === 'single' 
                          ? tempSelectedDate === date.toDateString()
                          : tempSelectedStartDate === date.toDateString() || tempSelectedEndDate === date.toDateString();
                        const isInRange = dateFilterMode === 'range' && tempSelectedStartDate && tempSelectedEndDate
                          ? date.getTime() >= new Date(tempSelectedStartDate).getTime() && date.getTime() <= new Date(tempSelectedEndDate).getTime()
                          : false;
                        const hasTranslations = hasTranslationsOnDate(date);
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.calendarDay,
                              !isCurrentMonth && styles.calendarDayOtherMonth,
                              isSelected && styles.calendarDaySelected,
                              isInRange && styles.calendarDayInRange,
                              hasTranslations && styles.calendarDayWithTranslations,
                            ]}
                            onPress={() => handleCalendarDatePress(date)}
                            disabled={!isCurrentMonth}
                          >
                            <Text style={[
                              styles.calendarDayText,
                              !isCurrentMonth && styles.calendarDayTextOtherMonth,
                              isSelected && styles.calendarDayTextSelected,
                              hasTranslations && styles.calendarDayTextWithTranslations,
                            ]}>
                              {date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {dateFilterMode === 'range' && (
                      <View style={styles.dateRangeInfo}>
                        <Text style={styles.dateRangeInfoText}>
                          {tempSelectedStartDate && !tempSelectedEndDate && 'Select end date'}
                          {tempSelectedStartDate && tempSelectedEndDate && 
                            `Range: ${formatDateHeader(tempSelectedStartDate)} - ${formatDateHeader(tempSelectedEndDate)}`
                          }
                          {!tempSelectedStartDate && 'Select start date'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.dateScrollView}
                >
                  {availableDates.map((date) => (
                    <TouchableOpacity
                      key={date}
                      style={[
                        styles.dateChip,
                        ((dateFilterMode === 'single' && selectedDate === date) ||
                         (dateFilterMode === 'range' && (selectedStartDate === date || selectedEndDate === date))) && styles.dateChipSelected
                      ]}
                      onPress={() => {
                        if (dateFilterMode === 'single') {
                          setTempSelectedDate(date);
                        } else {
                          const dateString = new Date(date).toDateString();
                          if (!tempSelectedStartDate || (tempSelectedStartDate && tempSelectedEndDate)) {
                            setTempSelectedStartDate(dateString);
                            setTempSelectedEndDate(null);
                          } else {
                            const startTime = new Date(tempSelectedStartDate).getTime();
                            const endTime = new Date(date).getTime();
                            if (endTime >= startTime) {
                              setTempSelectedEndDate(dateString);
                            } else {
                              setTempSelectedStartDate(dateString);
                              setTempSelectedEndDate(tempSelectedStartDate);
                            }
                          }
                        }
                      }}
                    >
                      <Text style={[
                        styles.dateChipText,
                        ((dateFilterMode === 'single' && selectedDate === date) ||
                         (dateFilterMode === 'range' && (selectedStartDate === date || selectedEndDate === date))) && styles.dateChipTextSelected
                      ]}>
                        {formatDateHeader(date)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Language Pair Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Filter by Language Pair</Text>
                <Text style={styles.filterSectionDescription}>
                  Select two languages to show translations between them (in both directions)
                </Text>
                
                <View style={styles.languagePairContainer}>
                  {/* From Language */}
                  <View style={styles.languageSelectContainer}>
                    <Text style={styles.languageSelectLabel}>From Language</Text>
                    <ScrollView style={styles.languageSelectScroll} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={[
                          styles.languageOption,
                          !tempSelectedFromLanguage && styles.languageOptionSelected
                        ]}
                        onPress={() => setTempSelectedFromLanguage(null)}
                      >
                        <Text style={[
                          styles.languageOptionText,
                          !tempSelectedFromLanguage && styles.languageOptionTextSelected
                        ]}>
                          Any Language
                        </Text>
                      </TouchableOpacity>
                      {SUPPORTED_LANGUAGES.map((language) => (
                        <TouchableOpacity
                          key={language.code}
                          style={[
                            styles.languageOption,
                            tempSelectedFromLanguage === language.code && styles.languageOptionSelected
                          ]}
                          onPress={() => setTempSelectedFromLanguage(language.code)}
                        >
                          <Text style={[
                            styles.languageOptionText,
                            tempSelectedFromLanguage === language.code && styles.languageOptionTextSelected
                          ]}>
                            {language.nativeName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Arrow */}
                  <View style={styles.languageArrowContainer}>
                    <Text style={styles.languageArrow}>↔</Text>
                  </View>

                  {/* To Language */}
                  <View style={styles.languageSelectContainer}>
                    <Text style={styles.languageSelectLabel}>To Language</Text>
                    <ScrollView style={styles.languageSelectScroll} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={[
                          styles.languageOption,
                          !tempSelectedToLanguage && styles.languageOptionSelected
                        ]}
                        onPress={() => setTempSelectedToLanguage(null)}
                      >
                        <Text style={[
                          styles.languageOptionText,
                          !tempSelectedToLanguage && styles.languageOptionTextSelected
                        ]}>
                          Any Language
                        </Text>
                      </TouchableOpacity>
                      {SUPPORTED_LANGUAGES.map((language) => (
                        <TouchableOpacity
                          key={language.code}
                          style={[
                            styles.languageOption,
                            tempSelectedToLanguage === language.code && styles.languageOptionSelected
                          ]}
                          onPress={() => setTempSelectedToLanguage(language.code)}
                        >
                          <Text style={[
                            styles.languageOptionText,
                            tempSelectedToLanguage === language.code && styles.languageOptionTextSelected
                          ]}>
                            {language.nativeName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
              {hasActiveFilters() ? 'No matching translations' : searchQuery ? 'No matching translations' : 'No Translation History'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters() ? 'Try adjusting your filters or clear them to see more results' : searchQuery ? 'Try a different search term' : 'Start translating to build your learning history'}
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  clearButton: {
    padding: 8,
  },
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
  filterButton: {
    padding: 8,
    marginLeft: 4,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 4,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  activeFiltersText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  clearFiltersButton: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  filterSectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    lineHeight: 20,
  },
  dateScrollView: {
    flexDirection: 'row',
  },
  dateChip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  dateChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dateChipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dateChipTextSelected: {
    color: '#FFF',
  },
  dateFilterModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 2,
  },
  dateFilterModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  dateFilterModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  dateFilterModeText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  dateFilterModeTextActive: {
    color: '#FFF',
  },
  calendarToggleBanner: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#555',
  },
  calendarBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarBannerText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  calendarBannerArrow: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarHeaderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 2,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#007AFF',
  },
  calendarDayInRange: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  calendarDayWithTranslations: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  calendarDayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayTextOtherMonth: {
    color: '#666',
  },
  calendarDayTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  calendarDayTextWithTranslations: {
    color: '#34C759',
    fontWeight: '600',
  },
  dateRangeInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
  },
  dateRangeInfoText: {
    color: '#007AFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  languagePairContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  languageSelectContainer: {
    flex: 1,
  },
  languageSelectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 8,
  },
  languageSelectScroll: {
    height: 150,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  languageOptionSelected: {
    backgroundColor: '#007AFF',
  },
  languageOptionText: {
    color: '#FFF',
    fontSize: 14,
  },
  languageOptionTextSelected: {
    color: '#FFF',
    fontWeight: '500',
  },
  languageArrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  languageArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  clearAllButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  },
});