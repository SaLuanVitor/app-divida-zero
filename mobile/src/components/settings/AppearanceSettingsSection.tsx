import React from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { Settings2 } from 'lucide-react-native';
import Card from '../Card';
import AppText from '../AppText';
import { AppPreferences } from '../../types/settings';

const TEXT_SIZE_OPTIONS: Array<{ label: string; value: AppPreferences['font_scale'] }> = [
  { label: 'Pequeno', value: 0.9 },
  { label: 'Normal', value: 1 },
  { label: 'Grande', value: 1.15 },
  { label: 'Extra grande', value: 1.3 },
];

type AppearanceSettingsSectionProps = {
  darkMode: boolean;
  fontScale: AppPreferences['font_scale'];
  largerTouchTargets: boolean;
  rowHeight: number;
  onToggleDarkMode: (value: boolean) => void;
  onToggleTouchTargets: (value: boolean) => void;
  onSelectFontScale: (value: AppPreferences['font_scale']) => void;
};

const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  darkMode,
  fontScale,
  largerTouchTargets,
  rowHeight,
  onToggleDarkMode,
  onToggleTouchTargets,
  onSelectFontScale,
}) => {
  const Item = ({
    title,
    subtitle,
    value,
    onChange,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <View className="py-3 border-b border-slate-100 dark:border-slate-800" style={{ minHeight: rowHeight + 10, justifyContent: 'center' }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-semibold">{title}</AppText>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{subtitle}</AppText>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Card className="p-4">
      <View className="flex-row items-center mb-2">
        <Settings2 size={16} color="#64748b" />
        <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">Aparência e acessibilidade</AppText>
      </View>

      <Item
        title="Modo escuro"
        subtitle="Ativa tema escuro em todo o aplicativo."
        value={darkMode}
        onChange={onToggleDarkMode}
      />

      <Item
        title="Botões maiores"
        subtitle="Aumenta áreas de toque para facilitar a navegação."
        value={largerTouchTargets}
        onChange={onToggleTouchTargets}
      />

      <View className="pt-3">
        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-2">Tamanho do texto</AppText>
        <View className="flex-row flex-wrap justify-between">
          {TEXT_SIZE_OPTIONS.map((option) => {
            const selected = fontScale === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`w-[48.5%] px-3 rounded-xl border items-center justify-center mb-2 ${
                  selected
                    ? 'bg-primary border-primary'
                    : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
                }`}
                onPress={() => onSelectFontScale(option.value)}
                style={{ minHeight: rowHeight }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Tamanho do texto ${option.label}`}
              >
                <AppText className={`text-xs font-bold text-center ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                  {option.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
        <AppText className="text-[11px] text-slate-500 dark:text-slate-200 mt-2">
          Pré-visualização: o app inteiro aplica este tamanho automaticamente.
        </AppText>
      </View>
    </Card>
  );
};

export default AppearanceSettingsSection;

