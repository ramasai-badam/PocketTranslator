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
import { ArrowLeft, MessageCircle, Trash2, BarChart3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { TranslationHistoryManager, LanguagePairConversation } from '../utils/TranslationHistory';

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<LanguagePairConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState({
    totalConversations: 0,
    totalTranslations: 0,
    mostUsedLanguagePair: null as string | null,
  });

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const [convs, stats] = await Promise.all([
        TranslationHistoryManager.getAllConversations(),
        TranslationHistoryManager.getStatistics(),
      ]);
      setConversations(convs);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load translation history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
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
              setConversations([]);
              setStatistics({
                totalConversations: 0,
                totalTranslations: 0,
                mostUsedLanguagePair: null,
              });
              Alert.alert('Success', 'All translation history has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
          disabled={conversations.length === 0}
        >
          <Trash2 size={20} color={conversations.length > 0 ? "#FF3B30" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <BarChart3 size={20} color="#007AFF" />
          <Text style={styles.statNumber}>{statistics.totalTranslations}</Text>
          <Text style={styles.statLabel}>Translations</Text>
        </View>
        <View style={styles.statItem}>
          <MessageCircle size={20} color="#34C759" />
          <Text style={styles.statNumber}>{statistics.totalConversations}</Text>
          <Text style={styles.statLabel}>Conversations</Text>
        </View>
      </View>

      {statistics.mostUsedLanguagePair && (
        <View style={styles.mostUsedContainer}>
          <Text style={styles.mostUsedText}>
            Most practiced: {statistics.mostUsedLanguagePair}
          </Text>
        </View>
      )}

      {/* Conversations List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#666" />
            <Text style={styles.emptyTitle}>No Translation History</Text>
            <Text style={styles.emptySubtitle}>
              Start translating to build your learning history
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.languagePair}
              style={styles.conversationItem}
              onPress={() => handleConversationPress(conversation)}
            >
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationTitle}>
                  {conversation.displayName}
                </Text>
                <Text style={styles.conversationTime}>
                  {formatDate(conversation.lastUpdated)}
                </Text>
              </View>
              <View style={styles.conversationFooter}>
                <Text style={styles.conversationCount}>
                  {conversation.totalEntries} translation{conversation.totalEntries !== 1 ? 's' : ''}
                </Text>
                <View style={styles.conversationArrow}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {conversations.length > 0 && (
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
  conversationItem: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationCount: {
    fontSize: 14,
    color: '#999',
  },
  conversationArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
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