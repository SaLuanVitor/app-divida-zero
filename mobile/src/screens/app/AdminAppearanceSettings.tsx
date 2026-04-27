import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import AppText from '../../components/AppText';
import AppearanceSettingsSection from '../../components/settings/AppearanceSettingsSection';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { controlHeight } from '../../utils/responsive';

const AdminAppearanceSettings = () => {
  const navigation = useNavigation<any>();
  const { darkMode, setDarkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();

  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const rowHeight = controlHeight(fontScale, largerTouchTargets, 44);

  useEffect(() => {
    const load = async () => {
      const result = await getAppPreferences();
      setPrefs(result);
    };
    load();
  }, []);

  const setFontScale = async (nextFontScale: AppPreferences['font_scale']) => {
    const next = {
      ...prefs,
      font_scale: nextFontScale,
      large_text: nextFontScale > 1,
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

  const updateTouchTargets = async (value: boolean) => {
    const next = { ...prefs, larger_touch_targets: value };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    try {
      await saveAppPreferences(next);
      setMessage('Tamanho dos botões atualizado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Aparência e acessibilidade</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Ajuste visual do portal administrativo para facilitar a leitura.
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <AppearanceSettingsSection
          darkMode={darkMode}
          fontScale={prefs.font_scale}
          largerTouchTargets={prefs.larger_touch_targets}
          rowHeight={rowHeight}
          onToggleDarkMode={handleThemeToggle}
          onToggleTouchTargets={updateTouchTargets}
          onSelectFontScale={setFontScale}
        />

        {message ? (
          <View className="mt-3 rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
            <AppText className="text-emerald-700 dark:text-emerald-300 text-sm">{message}</AppText>
          </View>
        ) : null}

        {saving ? <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">Salvando...</AppText> : null}
      </View>
    </Layout>
  );
};

export default AdminAppearanceSettings;

