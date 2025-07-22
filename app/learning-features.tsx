import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, Brain, Target } from 'lucide-react-native';
import { router } from 'expo-router';

export default function LearningFeaturesScreen() {
  const features = [
    {
      id: 'vocabulary',
      title: 'Vocabulary Builder',
      description: 'Save and review words from your translations',
      icon: BookOpen,
      route: '/vocabulary',
      color: '#3B82F6',
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      description: 'Practice with interactive flashcards',
      icon: Brain,
      route: '/flashcards',
      color: '#10B981',
      comingSoon: true,
    },
    {
      id: 'pronunciation',
      title: 'Pronunciation Practice',
      description: 'Improve your speaking skills',
      icon: Target,
      route: '/pronunciation',
      color: '#F59E0B',
      comingSoon: true,
    },
  ];

  const handleFeaturePress = (feature: typeof features[0]) => {
    if (feature.comingSoon) {
      return;
    }
    router.push(feature.route as any);
  };

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
        <Text style={styles.headerTitle}>Learning Features</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Enhance your language learning with these interactive tools
          </Text>

          <View style={styles.featuresContainer}>
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <TouchableOpacity
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    feature.comingSoon && styles.featureCardDisabled,
                  ]}
                  onPress={() => handleFeaturePress(feature)}
                  disabled={feature.comingSoon}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                    <IconComponent size={32} color="#FFF" />
                  </View>
                  <View style={styles.featureContent}>
                    <View style={styles.featureTitleContainer}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      {feature.comingSoon && (
                        <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                      )}
                    </View>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                  {!feature.comingSoon && (
                    <Text style={styles.featureArrow}>›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  featureCardDisabled: {
    opacity: 0.6,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '500',
  },
  featureDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  featureArrow: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
    marginLeft: 12,
  },
});