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
import { ArrowLeft, Volume2, Trash2, BookOpen } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { VocabularyManager, VocabularyEntry } from '../utils/VocabularyManager';
import { getLanguageDisplayName } from '../utils/LanguageConfig';

export default function VocabularyListScreen() {
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVocabularyWords();
  }, []);

  const loadVocabularyWords = async () => {
    try {
      const words = await VocabularyManager.getAllVocabularyWords();
      setVocabularyWords(words);
    } catch (error) {
      console.error('Failed to load vocabulary words:', error);
      Alert.alert('Error', 'Failed to load vocabulary words');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVocabularyWords();
  };

  const handleDeleteWord = async (wordId: string) => {
    Alert.alert(
      'Delete Word',
      'Are you sure you want to remove this word from your vocabulary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyManager.deleteVocabularyWord(wordId);
              setVocabularyWords(prev => prev.filter(word => word.id !== wordId));
              Alert.alert('Success', 'Word removed from vocabulary');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete word');
            }
          },
        },
      ]
    );
  };

  const handleSpellWord = async (word: string, languageCode: string) => {
    try {
      // Clean the word of punctuation for better pronunciation
      const cleanWord = word.replace(/[^\w\s]/gi, '').trim();
      if (!cleanWord) return;

      // Speak the word slowly for spelling practice
      Speech.speak(cleanWord, {
        language: languageCode,
        pitch: 1.0,
        rate: 0.4, // Slower rate for better pronunciation practice
      });
    } catch (error) {
      console.error('Failed to spell word:', error);
    }
  };

  const renderInteractiveText = (text: string, languageCode: string) => {
    const words = text.split(/(\s+)/).filter(part => part.length > 0);
    
    return (
      <View style={styles.interactiveTextContainer}>
        {words.map((part, index) => {
          const isWord = /\S/.test(part); // Check if it's not just whitespace
          
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
            {vocabularyWords.length} word{vocabularyWords.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Vocabulary Words */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {vocabularyWords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Vocabulary Words Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add words from your translation history to start building your vocabulary
            </Text>
          </View>
        ) : (
          vocabularyWords.map((word) => (
            <View key={word.id} style={styles.wordContainer}>
              <View style={styles.wordHeader}>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageLabel}>
                    {getLanguageDisplayName(word.originalLanguage)} → {getLanguageDisplayName(word.translatedLanguage)}
                  </Text>
                </View>
                
                <View style={styles.wordHeaderRight}>
                  <Text style={styles.dateAdded}>{word.dateAdded}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteWord(word.id)}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Original Text - Interactive */}
              <View style={[styles.textContainer, styles.originalTextContainer]}>
                <View style={styles.textHeader}>
                  <Text style={styles.textLabel}>Original</Text>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => Speech.speak(word.originalText, { language: word.originalLanguage })}
                  >
                    <Volume2 size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                {renderInteractiveText(word.originalText, word.originalLanguage)}
              </View>

              {/* Translation - Interactive */}
              <View style={[styles.textContainer, styles.translatedTextContainer]}>
                <View style={styles.textHeader}>
                  <Text style={styles.textLabel}>Translation</Text>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => Speech.speak(word.translatedText, { language: word.translatedLanguage })}
                  >
                    <Volume2 size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                {renderInteractiveText(word.translatedText, word.translatedLanguage)}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {vocabularyWords.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tap on any word to hear its pronunciation
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
  headerSpacer: {
    width: 44,
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
  speakButton: {
    padding: 4,
  },
  interactiveTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordButton: {
    paddingHorizontal: 1,
    paddingVertical: 0,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 0.5,
    marginVertical: 0.5,
  },
  interactiveWord: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 20,
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
});