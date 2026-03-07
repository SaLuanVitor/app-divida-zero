import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Settings2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';

const AppSettings = () => {
  const navigation = useNavigation<any>();
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

  const updatePreference = async (key: keyof AppPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    try {
      await saveAppPreferences(next);
      setMessage('Configurações salvas com sucesso.');
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
    <View className="py-3 border-b border-slate-100">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-slate-900 font-semibold">{title}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{subtitle}</Text>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] p-0">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 text-xl font-bold">Configurações do app</Text>
            <Text className="text-slate-500 text-xs">Ajuste visual e comportamento do aplicativo.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Settings2 size={16} color="#64748b" />
            <Text className="text-slate-700 font-bold ml-2">Preferências gerais</Text>
          </View>
          <Item
            title="Modo escuro (em breve)"
            subtitle="Mantém seu tema preferido quando estiver disponível."
            value={prefs.dark_mode}
            onChange={(value) => updatePreference('dark_mode', value)}
          />
          <Item
            title="Modo compacto"
            subtitle="Mostra mais informações por tela."
            value={prefs.compact_mode}
            onChange={(value) => updatePreference('compact_mode', value)}
          />
          <Item
            title="Texto maior"
            subtitle="Aumenta a leitura de títulos e conteúdos."
            value={prefs.large_text}
            onChange={(value) => updatePreference('large_text', value)}
          />
        </Card>

        {message ? (
          <View className="mt-3 rounded-xl px-3 py-2 bg-emerald-50 border border-emerald-200">
            <Text className="text-emerald-700 text-sm">{message}</Text>
          </View>
        ) : null}

        {saving ? <Text className="text-slate-500 text-xs mt-2">Salvando...</Text> : null}
      </View>
    </Layout>
  );
};

export default AppSettings;
