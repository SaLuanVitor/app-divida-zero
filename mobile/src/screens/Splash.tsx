import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import AppText from '../components/AppText';
import { useThemeMode } from '../context/ThemeContext';
import { useAccessibility } from '../context/AccessibilityContext';

const Splash = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { darkMode } = useThemeMode();
  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, reduceMotion]);

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000000' : '#ffffff' }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <ShieldCheck size={64} color="#f48c25" />
        </View>
        <AppText style={[styles.title, { color: darkMode ? '#e2e8f0' : '#0f172a' }]}>
          Dívida<AppText style={styles.titleHighlight}>Zero</AppText>
        </AppText>
        <AppText style={[styles.subtitle, { color: darkMode ? '#64748b' : '#94a3b8' }]}>
          Assuma o Controle
        </AppText>

        <View style={styles.loader}>
          <ActivityIndicator color="#f48c25" size="small" />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: 'rgba(244, 140, 37, 0.1)',
    padding: 24,
    borderRadius: 9999,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  titleHighlight: {
    color: '#f48c25',
  },
  subtitle: {
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  loader: {
    marginTop: 80,
  },
});

export default Splash;

