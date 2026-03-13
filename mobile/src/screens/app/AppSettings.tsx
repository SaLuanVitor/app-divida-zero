import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Settings2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';
import { useThemeMode } from '../../context/ThemeContext';

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

  const updatePreference = async (key: Exclude<keyof AppPreferences, 'dark_mode'>, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    try {
      await saveAppPreferences(next);
      setMessage('Configuracoes salvas com sucesso.');
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
            <Text className="text-slate-500 dark:text-slate-300 text-xs">Ajuste visual e comportamento do aplicativo.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Settings2 size={16} color="#64748b" />
            <Text className="text-slate-700 dark:text-slate-200 font-bold ml-2">Preferencias gerais</Text>
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
            onChange={(value) => updatePreference('large_text', value)}
          />
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



