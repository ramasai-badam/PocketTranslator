import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Volume2, Trash2, BookOpen, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { TranslationHistoryManager, VocabularyEntry } from '../utils/TranslationHistory';
import { TTSVoiceManager } from '../utils/LanguagePackManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

export default function VocabularyScreen() {
  const [vocabularyList, setVocabularyList] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      const vocabulary = await TranslationHistoryManager.getVocabularyList();
      setVocabularyList(vocabulary);
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      Alert.alert('Error', 'Failed to load vocabulary list');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVocabulary();
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

  const handleDeleteEntry = (entryId: string, originalWord: string) => {
    Alert.alert(
      'Delete Vocabulary Entry',
      `Are you sure you want to delete "${originalWord}" from your vocabulary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TranslationHistoryManager.deleteVocabularyEntry(entryId);
              await loadVocabulary(); // Reload data
              Alert.alert('Success', 'Vocabulary entry deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vocabulary entry');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Vocabulary',
      'Are you sure you want to delete all vocabulary entries? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await TranslationHistoryManager.clearVocabulary();
              setVocabularyList([]);
              Alert.alert('Success', 'All vocabulary entries have been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear vocabulary');
            }
          },
        },
      ]
    );
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
            {vocabularyList.length} word{vocabularyList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAll}
          disabled={vocabularyList.length === 0}
        >
          <Trash2 size={20} color={vocabularyList.length > 0 ? "#FF3B30" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Vocabulary List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {vocabularyList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Vocabulary Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add words from your translation history to build your personal vocabulary list
            </Text>
            <TouchableOpacity
              style={styles.addFromHistoryButton}
              onPress={() => router.push('/history')}
            >
              <Plus size={20} color="#007AFF" />
              <Text style={styles.addFromHistoryText}>Browse Translation History</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vocabularyList.map((entry) => (
            <View key={entry.id} style={styles.vocabularyItem}>
              <View style={styles.vocabularyContent}>
                {/* Original Word */}
                <View style={styles.wordContainer}>
                  <View style={styles.wordHeader}>
                    <Text style={styles.languageLabel}>
                      {getLanguageDisplayName(entry.fromLanguage)}
                    </Text>
                    <TouchableOpacity
                      style={styles.speakButton}
                      onPress={() => handleSpeak(entry.originalWord, entry.fromLanguage)}
                    >
                      <Volume2 size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.originalWord}>{entry.originalWord}</Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>

                {/* Translated Word */}
                <View style={styles.wordContainer}>
                  <View style={styles.wordHeader}>
                    <Text style={styles.languageLabel}>
                      {getLanguageDisplayName(entry.toLanguage)}
                    </Text>
                    <TouchableOpacity
                      style={styles.speakButton}
                      onPress={() => handleSpeak(entry.translatedWord, entry.toLanguage)}
                    >
                      <Volume2 size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.translatedWord}>{entry.translatedWord}</Text>
                </View>
              </View>

              {/* Entry Footer */}
              <View style={styles.entryFooter}>
                <Text style={styles.entryDate}>{formatDate(entry.timestamp)}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEntry(entry.id, entry.originalWord)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {vocabularyList.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎯 Tip: Tap the speaker icons to practice pronunciation and improve your listening skills
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
    paddingHorizontal: 40,
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
    lineHeight: 22,
    marginBottom: 24,
  },
  addFromHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    gap: 8,
  },
  addFromHistoryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  vocabularyItem: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  vocabularyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordContainer: {
    flex: 1,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  languageLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  speakButton: {
    padding: 4,
  },
  originalWord: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  arrow: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  translatedWord: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  entryDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
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