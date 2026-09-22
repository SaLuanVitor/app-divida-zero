import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import AppText from './AppText';
import Button from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  /** Texto do botão de ação; se ausente, não renderiza CTA. */
  actionLabel?: string;
  onAction?: () => void;
  /** Cor do ícone; padrão neutro. */
  iconColor?: string;
  containerStyle?: ViewStyle;
}

/**
 * Estado vazio reutilizável: ícone + título + mensagem opcional + CTA opcional.
 * Usa ícones lucide (SVG), então não depende de imagens externas.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  iconColor = '#94a3b8',
  containerStyle,
}) => (
  <View
    className="items-center justify-center px-6 py-10"
    style={containerStyle}
    accessibilityLabel={title}
  >
    <View className="w-20 h-20 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
      <Icon size={40} color={iconColor} />
    </View>
    <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold text-center mt-4">
      {title}
    </AppText>
    {message ? (
      <AppText className="text-slate-500 dark:text-slate-300 text-sm text-center mt-1">
        {message}
      </AppText>
    ) : null}
    {actionLabel && onAction ? (
      <View className="mt-5">
        <Button title={actionLabel} variant="primary" size="md" onPress={onAction} />
      </View>
    ) : null}
  </View>
);

export default EmptyState;
