import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LanguageService from '../services/LanguageService';
import DatabaseService from '../services/DatabaseService';

const LanguageSelectionScreen = ({ navigation }) => {
  const [selectedLang, setSelectedLang] = useState(LanguageService.getCurrentLanguage());
  const t = LanguageService.t;

  const handleContinue = async () => {
    try {
      await LanguageService.changeLanguage(selectedLang);

      // check user
      const user = await DatabaseService.getUserProfile();
      if (user) {
        // persist language in DB for user
        await DatabaseService.updateUserLanguage(user.id, selectedLang);
        // reset to main app so Home will re-mount and show language
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        // no user -> go to auth flow (login/register)
        navigation.navigate('AuthScreen', { selectedLanguage: selectedLang });
      }
    } catch (err) {
      console.error('Language select error', err);
      // fallback: still navigate to auth
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="language-outline" size={80} color="#2E7D32" />
      <Text style={styles.title}>{t('selectLanguage')}</Text>
      <Text style={styles.subtitle}>अपनी भाषा चुनें</Text>
      <View style={styles.titleContainer}>
        {/* Dynamically show "Select Language" in a few key languages */}
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
          >
            <Text
              style={[
                styles.langText,
                selectedLang === lang.code && styles.selectedLangText,
              ]}
            >
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>{t('continue')}</Text>
        <Ionicons name="arrow-forward-outline" size={20} color="white" style={{ marginLeft: 10 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 20 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 40 },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 18, color: '#666', marginTop: 4 },
  langContainer: { width: '100%', marginBottom: 40 },
  langButton: { backgroundColor: 'white', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  selectedLangButton: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  langText: { fontSize: 18, textAlign: 'center', color: '#333' },
  selectedLangText: { color: 'white', fontWeight: 'bold' },
  continueButton: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, alignItems: 'center' },
  continueButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default LanguageSelectionScreen;
