import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { getString } from '@/utils/strings';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  isRotated?: boolean;
  displayLanguage?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  isRotated = false,
  displayLanguage,
}: LanguageSelectorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const selectedLang = LANGUAGES.find(lang => lang.code === selectedLanguage);
  const currentDisplayLanguage = displayLanguage || selectedLanguage;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.selectedText}>
          {selectedLang?.name || getString(currentDisplayLanguage, 'selectLanguage')}
        </Text>
        <ChevronDown 
          size={12} 
          color="white" 
          style={[
            styles.chevron,
            isExpanded && styles.chevronExpanded,
            isRotated && styles.chevronRotated
          ]} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.option,
                  selectedLanguage === language.code && styles.selectedOption,
                ]}
                onPress={() => {
                  onLanguageChange(language.code);
                  setIsExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedLanguage === language.code && styles.selectedOptionText,
                  ]}
                >
                  {language.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    position: 'relative',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    position: 'relative',
    top: 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 10,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 40,
    zIndex: 9999,
  },
  scrollView: {
    maxHeight: 200,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
});