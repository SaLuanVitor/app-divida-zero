import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { AppText } from './AppText';
import { AppView } from './Layout';

export interface ConnectionLimitBarProps {
  used: number;
  limit: number;
  resourceName: string;
  onPress?: () => void;
  showTooltip?: boolean;
}

export const ConnectionLimitBar: React.FC<ConnectionLimitBarProps> = ({
  used,
  limit,
  resourceName,
  onPress,
  showTooltip = true,
}) => {
  const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const remaining = Math.max(limit - used, 0);

  const getStatus = (pct: number): 'normal' | 'caution' | 'warning' | 'blocked' => {
    if (pct >= 100) return 'blocked';
    if (pct >= 80) return 'warning';
    if (pct >= 70) return 'caution';
    return 'normal';
  };

  const status = getStatus(percentage);

  const statusColors = {
    normal: { bg: '#22c55e', text: '#166534', label: 'Normal' },
    caution: { bg: '#f59e0b', text: '#92400e', label: 'Atenção' },
    warning: { bg: '#f97316', text: '#9a3412', label: 'Próximo do limite' },
    blocked: { bg: '#ef4444', text: '#991b1b', label: 'Limite atingido' },
  };

  const colors = statusColors[status];

  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const tooltipAnim = React.useRef(new Animated.Value(0)).current;
  const [showTooltipState, setShowTooltipState] = React.useState(false);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage / 100,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const handlePress = () => {
    if (onPress) onPress();
    if (showTooltip && status !== 'normal') {
      setShowTooltipState(true);
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(tooltipAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => setShowTooltipState(false));
        }, 3000);
      });
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const tooltipOpacity = tooltipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const tooltipTranslateY = tooltipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  if (limit === 0) {
    return (
      <AppView style={styles.container} onPress={handlePress}>
        <AppText style={styles.label}>{resourceName}</AppText>
        <View style={styles.barContainer}>
          <Animated.View style={[styles.bar, { backgroundColor: '#e2e8f0' }]} />
        </View>
        <AppText style={[styles.info, { color: '#64748b' }]}>
          Ilimitado
        </AppText>
      </AppView>
    );
  }

  return (
    <AppView style={styles.container} onPress={handlePress} accessible={true} accessibilityLabel={`${resourceName}: ${used} de ${limit} (${percentage}%)`}>
      <View style={styles.header}>
        <AppText style={styles.label} numberOfLines={1}>
          {resourceName}
        </AppText>
        <AppText style={[styles.counter, { color: colors.text }]}>
          {used} / {limit}
        </AppText>
      </View>

      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.barBackground,
            { backgroundColor: '#e2e8f0' },
          ]}
        >
          <Animated.View
            style={[
              styles.barFill,
              { backgroundColor: colors.bg },
              { width: progressWidth },
            ]}
          />
        </Animated.View>
      </View>

      <AppText style={[styles.info, { color: colors.text }]}>
        {percentage}% utilizado • {remaining} restante
      </AppText>

      {showTooltipState && status !== 'normal' && (
        <Animated.View
          style={[
            styles.tooltip,
            { backgroundColor: colors.bg },
            { opacity: tooltipOpacity },
            { transform: [{ translateY: tooltipTranslateY }] },
          ]}
          pointerEvents="none"
        >
          <AppText style={[styles.tooltipText, { color: '#fff' }]}>
            {percentage >= 100
              ? `Você atingiu o limite do plano gratuito. Desconecte uma instituição para conectar outra.`
              : percentage >= 80
              ? `Você está próximo do limite de ${resourceName.toLowerCase()}. ${used} de ${limit} utilizadas.`
              : `Atenção: ${percentage}% do limite utilizado.`}
          </AppText>
        </Animated.View>
      )}
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barBackground: {
    flex: 1,
    height: '100%',
    borderRadius: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  info: {
    fontSize: 12,
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default ConnectionLimitBar;