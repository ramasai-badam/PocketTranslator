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
import { ArrowLeft, Volume2, Trash2, User, BookmarkPlus } from 'lucide-react-native';
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
  
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversationEntries();
  }, [languagePair]);

  const loadConversationEntries = async () => {
    try {
      if (!languagePair) return;
      
      // Parse language pair (e.g., "en-es" -> ["en", "es"])
      const [lang1, lang2] = languagePair.split('-');
      const conversation = await TranslationHistoryManager.getConversation(lang1, lang2);
      
      if (conversation) {
        // Sort entries by timestamp (newest first)
        const sortedEntries = conversation.entries.sort((a, b) => b.timestamp - a.timestamp);
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
      const result = await VocabularyManager.saveVocabularyWord(
        entry.originalText,
        entry.translatedText,
        entry.fromLanguage,
        entry.toLanguage
      );

      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert(
          result.isDuplicate ? 'Already Added' : 'Error',
          result.message
        );
      }
    } catch (error) {
      console.error('Failed to add word to vocabulary:', error);
      Alert.alert('Error', 'Failed to add word to vocabulary');
    }
  };

  const handleClearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      `Are you sure you want to delete all translations for ${displayName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const [lang1, lang2] = languagePair.split('-');
              await TranslationHistoryManager.clearConversation(lang1, lang2);
              setEntries([]);
              Alert.alert('Success', 'Conversation history has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear conversation');
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
            <View key={entry.id} style={styles.entryContainer}>
              <View style={styles.entryHeader}>
                <View style={styles.speakerInfo}>
                  <Text style={styles.speakerIcon}>{getSpeakerIcon(entry.speaker)}</Text>
                  <Text style={[styles.speakerLabel, { color: getSpeakerColor(entry.speaker) }]}>
                    {entry.speaker === 'user1' ? 'Speaker 1' : 'Speaker 2'}
                  </Text>
                  <TouchableOpacity
                    style={styles.addToVocabButton}
                    onPress={() => handleAddToVocabulary(entry)}
                  >
                    <BookmarkPlus size={16} color="#34C759" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
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
            </View>
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
    borderWidth: 1,
    borderColor: '#333',
  },
  entryTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 12,
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
});