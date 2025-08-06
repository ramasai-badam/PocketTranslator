import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../utils/LanguageConfig';
import { useTextSize } from '../contexts/TextSizeContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { getTextSizeConfig } = useTextSize();
  const textConfig = getTextSizeConfig();
  const { colors } = useTheme();

  const selectedLang = getLanguageByCode(selectedLanguage);

  return (
    <View style={styles.container} pointerEvents="auto">
      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: colors.selectorBackground,
            borderColor: colors.selectorBorder,
          }
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Language selector. Currently selected: ${selectedLang?.nativeName || 'No language selected'}`}
        accessibilityHint={isExpanded ? "Tap to close language options" : "Tap to open language options"}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={[styles.selectedText, { fontSize: textConfig.fontSize, color: colors.buttonText }]}>
          {selectedLang?.nativeName || 'Select Language'}
        </Text>
        <ChevronDown 
          size={Math.max(10, textConfig.fontSize * 0.6)} 
          color={colors.buttonText} 
          style={[
            styles.chevron,
            isExpanded && styles.chevronExpanded
          ]} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={[
          styles.dropdown,
          {
            backgroundColor: colors.dropdownBackground,
            borderColor: colors.dropdownBorder,
          }
        ]} pointerEvents="auto">
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            removeClippedSubviews={false}
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.option,
                  {
                    borderBottomColor: colors.borderTransparent,
                  },
                  selectedLanguage === language.code && [
                    styles.selectedOption,
                    { backgroundColor: colors.optionSelected }
                  ],
                ]}
                onPress={() => {
                  onLanguageChange(language.code);
                  setIsExpanded(false);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Select ${language.nativeName} language`}
                accessibilityState={{ selected: selectedLanguage === language.code }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { 
                      fontSize: textConfig.fontSize,
                      color: colors.buttonText,
                    },
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
    position: 'relative',
    overflow: 'visible',
    zIndex: 10000,
    elevation: 1000,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedText: {
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    borderRadius: 10,
    maxHeight: 200,
    borderWidth: 1,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    maxHeight: 200,
    flexGrow: 0,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectedOption: {
    // backgroundColor will be set dynamically
  },
  optionText: {
    // color will be set dynamically
  },
  selectedOptionText: {
    fontWeight: '600',
  },
});