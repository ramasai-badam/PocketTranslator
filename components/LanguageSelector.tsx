import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../utils/LanguageConfig';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  isRotated?: boolean;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  isRotated = false,
}: LanguageSelectorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const selectedLang = getLanguageByCode(selectedLanguage);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.selectedText}>
          {selectedLang?.nativeName || 'Select Language'}
        </Text>
        <ChevronDown 
          size={12} 
          color="white" 
          style={[
            styles.chevron,
            isExpanded && styles.chevronExpanded
          ]} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdown} pointerEvents="auto">
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
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
                    selectedLanguage === language.code && styles.selectedOptionText
                  ]}
                >
                  {language.nativeName}
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
    zIndex: 10000,
    position: 'relative',
    elevation: 1000,
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
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    borderRadius: 10,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 1000,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollView: {
    maxHeight: 200,
  },
  scrollContent: {
    paddingVertical: 4,
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