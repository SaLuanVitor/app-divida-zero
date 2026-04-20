import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import BrandLogo from '../components/BrandLogo';
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
        <BrandLogo
          variant="lockup"
          size={88}
          titleColor={darkMode ? '#e2e8f0' : '#0f172a'}
          subtitle="Assuma o controle"
          subtitleColor={darkMode ? '#64748b' : '#94a3b8'}
          subtitleSize={12}
        />

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
  loader: {
    marginTop: 80,
  },
});

export default Splash;
