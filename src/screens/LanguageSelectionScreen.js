import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageService from '../services/LanguageService';
import DatabaseService from '../services/DatabaseService';

function LanguageSelectionInner({ navigation }) {
  const [selectedLang, setSelectedLang] = useState(LanguageService.getCurrentLanguage());
  const t = LanguageService.t;
  const insets = useSafeAreaInsets();

  const handleContinue = async () => {
    try {
      await LanguageService.changeLanguage(selectedLang);
      const user = await DatabaseService.getUserProfile();
      if (user) {
        await DatabaseService.updateUserLanguage(user.id, selectedLang);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigation.navigate('AuthScreen', { selectedLanguage: selectedLang });
      }
    } catch (err) {
      console.error('Language select error', err);
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons
              accessibilityRole="image"
              accessibilityLabel={t('selectLanguage')}
              name="language-outline"
              size={80}
              color="#2E7D32"
            />
            <Text style={styles.title}>{t('selectLanguage')}</Text>
            <Text style={styles.subtitle}>अपनी भाषा चुनें</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{LanguageService.t('selectLanguage', { lng: 'en' })}</Text>
            <Text style={styles.subtitle}>{LanguageService.t('selectLanguage', { lng: 'hi' })}</Text>
            <Text style={styles.subtitle}>{LanguageService.t('selectLanguage', { lng: 'te' })}</Text>
          </View>

          <View style={styles.langContainer}>
            {LanguageService.getAvailableLanguages().map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langButton,
                  selectedLang === lang.code && styles.selectedLangButton,
                ]}
                onPress={() => setSelectedLang(lang.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedLang === lang.code }}
              >
                <Text
                  style={[
                    styles.langText,
                    selectedLang === lang.code && styles.selectedLangText,
                  ]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={2.0}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            accessibilityRole="button"
          >
            <Text style={styles.continueButtonText}>{t('continue')}</Text>
            <Ionicons name="arrow-forward-outline" size={20} color="white" style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

export default function LanguageSelectionScreen(props) {
  return (
    <SafeAreaProvider>
      <LanguageSelectionInner {...props} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  titleContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 18, color: '#666', marginTop: 4 },
  langContainer: { width: '100%', marginBottom: 24 },
  langButton: { backgroundColor: 'white', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  selectedLangButton: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  langText: { fontSize: 18, textAlign: 'center', color: '#333' },
  selectedLangText: { color: 'white', fontWeight: 'bold' },
  continueButton: { alignSelf: 'center', flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, alignItems: 'center', marginTop: 8 },
  continueButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
