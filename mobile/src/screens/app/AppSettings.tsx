import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Settings2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import AppText from '../../components/AppText';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences, updateAppPreferences } from '../../services/preferences';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { trackAnalyticsEvent } from '../../services/analytics';
import useBackToProfile from '../../hooks/useBackToProfile';

const TEXT_SIZE_OPTIONS: Array<{ label: string; value: AppPreferences['font_scale'] }> = [
  { label: 'Pequeno', value: 0.9 },
  { label: 'Normal', value: 1 },
  { label: 'Grande', value: 1.15 },
  { label: 'Extra grande', value: 1.3 },
];

const AppSettings = () => {
  const navigation = useNavigation<any>();
  const { darkMode, setDarkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();

  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  useEffect(() => {
    const load = async () => {
      const result = await getAppPreferences();
      setPrefs(result);
    };
    load();
  }, []);

  const setFontScale = async (fontScale: AppPreferences['font_scale']) => {
    const next = {
      ...prefs,
      font_scale: fontScale,
      large_text: fontScale > 1,
    };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    try {
      await saveAppPreferences(next);
      setMessage('Tamanho do texto atualizado com sucesso.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    setSaving(true);
    setMessage('');
    try {
      await setDarkMode(value);
      setPrefs((prev) => ({ ...prev, dark_mode: value }));
      setMessage('Tema atualizado com sucesso.');
    } finally {
      setSaving(false);
    }
  };

  const reopenTutorial = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateAppPreferences({
        onboarding_seen: false,
        tutorial_reopen_enabled: true,
      });
      await trackAnalyticsEvent({
        event_name: 'tutorial_reopened',
        screen: 'AppSettings',
      });
      setMessage('Tutorial reaberto. Você pode revisar as instruções.');
      navigation.navigate('Tutorial');
    } finally {
      setSaving(false);
    }
  };

  const updateAccessibilityToggle = async (
    key: 'reduce_motion' | 'larger_touch_targets',
    value: boolean,
    successMessage: string
  ) => {
    const next = {
      ...prefs,
      [key]: value,
    };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    try {
      await saveAppPreferences(next);
      setMessage(successMessage);
    } finally {
      setSaving(false);
    }
  };

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
          <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{subtitle}</AppText>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0 pb-28">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Configurações do app</AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs">
              Ajuste visual, tutorial e leitura do aplicativo.
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Settings2 size={16} color="#64748b" />
            <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">Preferências gerais</AppText>
          </View>

          <Item
            title="Modo escuro"
            subtitle="Ativa tema escuro em todo o aplicativo."
            value={darkMode}
            onChange={handleThemeToggle}
          />

          <Item
            title="Reduzir animações"
            subtitle="Diminui movimentos para maior conforto visual."
            value={prefs.reduce_motion}
            onChange={(value) => updateAccessibilityToggle('reduce_motion', value, 'Preferência de animação atualizada.')}
          />

          <Item
            title="Botões maiores"
            subtitle="Aumenta áreas de toque para facilitar a navegação."
            value={prefs.larger_touch_targets}
            onChange={(value) => updateAccessibilityToggle('larger_touch_targets', value, 'Tamanho dos botões atualizado.')}
          />

          <View className="pt-3">
            <AppText className="text-slate-600 dark:text-slate-300 text-xs mb-2">Tamanho do texto</AppText>
            <View className="flex-row flex-wrap gap-2">
              {TEXT_SIZE_OPTIONS.map((option) => {
                const selected = prefs.font_scale === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    className={`px-3 py-2 rounded-full border ${
                      selected
                        ? 'bg-primary border-primary'
                        : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
                    }`}
                    onPress={() => setFontScale(option.value)}
                    style={{ minHeight: rowHeight }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Tamanho do texto ${option.label}`}
                  >
                    <AppText className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppText className="text-[11px] text-slate-500 dark:text-slate-300 mt-2">
              Pré-visualização: o app inteiro aplica este tamanho automaticamente.
            </AppText>
          </View>
        </Card>

        <Card className="p-4 mt-4">
          <AppText className="text-slate-700 dark:text-slate-200 font-bold mb-1">Tutorial inicial</AppText>
          <AppText className="text-slate-500 dark:text-slate-300 text-xs mb-3">
            Reabra o tutorial para revisar orientações de uso quando quiser.
          </AppText>
          <Button title="Ver tutorial novamente" variant="outline" onPress={reopenTutorial} className="h-11" />
        </Card>

        {message ? (
          <View className="mt-3 rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
            <AppText className="text-emerald-700 dark:text-emerald-300 text-sm">{message}</AppText>
          </View>
        ) : null}

        {saving ? <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Salvando...</AppText> : null}
      </View>
    </Layout>
  );
};

export default AppSettings;
