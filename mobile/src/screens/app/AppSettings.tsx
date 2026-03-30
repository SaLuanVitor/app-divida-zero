import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Settings2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences, updateAppPreferences } from '../../services/preferences';
import { useThemeMode } from '../../context/ThemeContext';
import { trackAnalyticsEvent } from '../../services/analytics';

const AppSettings = () => {
  const navigation = useNavigation<any>();
  const { darkMode, setDarkMode } = useThemeMode();

  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      setMessage('Escala de texto atualizada com sucesso.');
    } finally {
      setSaving(false);
    }
  };

  const handleLargeTextToggle = async (value: boolean) => {
    await setFontScale(value ? 1.15 : 1);
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
    <View className="py-3 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-slate-900 dark:text-slate-100 font-semibold">{title}</Text>
          <Text className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{subtitle}</Text>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-black px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold">Configurações do app</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs">Ajuste visual, tutorial e leitura do aplicativo.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Settings2 size={16} color="#64748b" />
            <Text className="text-slate-700 dark:text-slate-200 font-bold ml-2">Preferências gerais</Text>
          </View>

          <Item
            title="Modo escuro"
            subtitle="Ativa tema escuro em todo o aplicativo."
            value={darkMode}
            onChange={handleThemeToggle}
          />

          <Item
            title="Texto maior"
            subtitle="Aumenta a leitura de títulos e conteúdos."
            value={prefs.large_text}
            onChange={handleLargeTextToggle}
          />

          <View className="pt-3">
            <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">Escala tipográfica</Text>
            <View className="flex-row gap-2">
              {[1, 1.15, 1.3].map((option) => {
                const selected = prefs.font_scale === option;
                return (
                  <TouchableOpacity
                    key={option}
                    className={`px-3 py-2 rounded-full border ${
                      selected
                        ? 'bg-primary border-primary'
                        : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
                    }`}
                    onPress={() => setFontScale(option as AppPreferences['font_scale'])}
                  >
                    <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {Math.round(option * 100)}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        <Card className="p-4 mt-4">
          <Text className="text-slate-700 dark:text-slate-200 font-bold mb-1">Tutorial inicial</Text>
          <Text className="text-slate-500 dark:text-slate-300 text-xs mb-3">
            Reabra o tutorial para revisar orientações de uso quando quiser.
          </Text>
          <Button title="Ver tutorial novamente" variant="outline" onPress={reopenTutorial} className="h-11" />
        </Card>

        {message ? (
          <View className="mt-3 rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
            <Text className="text-emerald-700 dark:text-emerald-300 text-sm">{message}</Text>
          </View>
        ) : null}

        {saving ? <Text className="text-slate-500 dark:text-slate-300 text-xs mt-2">Salvando...</Text> : null}
      </View>
    </Layout>
  );
};

export default AppSettings;
