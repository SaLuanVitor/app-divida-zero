import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';

const NotificationSettings = () => {
  const navigation = useNavigation<any>();
  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const result = await getAppPreferences();
      setPrefs(result);
    };
    load();
  }, []);

  const update = async (key: keyof AppPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };

    if (key === 'notifications_enabled' && !value) {
      next.notify_due_today = false;
      next.notify_due_tomorrow = false;
      next.notify_weekly_summary = false;
      next.notify_xp_and_badges = false;
    }

    if (key !== 'notifications_enabled' && value) {
      next.notifications_enabled = true;
    }

    setPrefs(next);
    setMessage('');
    await saveAppPreferences(next);
    setMessage('Preferencias de notificacao salvas.');
  };

  const Item = ({
    title,
    subtitle,
    value,
    onChange,
    disabled,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View className={`py-3 border-b border-slate-100 ${disabled ? 'opacity-50' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-slate-900 font-semibold">{title}</Text>
          <Text className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{subtitle}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: '#f48c25' }}
        />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 text-xl font-bold">Notificações</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs">Defina o que voce quer receber.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Bell size={16} color="#64748b" />
            <Text className="text-slate-700 font-bold ml-2">Canais e alertas</Text>
          </View>

          <Item
            title="Ativar notificacoes"
            subtitle="Liga ou desliga todas as notificacoes do app."
            value={prefs.notifications_enabled}
            onChange={(value) => update('notifications_enabled', value)}
          />
          <Item
            title="Vencimentos de hoje"
            subtitle="Aviso no dia de vencimento das dividas e lancamentos."
            value={prefs.notify_due_today}
            onChange={(value) => update('notify_due_today', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Lembrete do dia seguinte"
            subtitle="Aviso antecipado para preparar o pagamento."
            value={prefs.notify_due_tomorrow}
            onChange={(value) => update('notify_due_tomorrow', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Resumo semanal"
            subtitle="Resumo dos principais movimentos financeiros da semana."
            value={prefs.notify_weekly_summary}
            onChange={(value) => update('notify_weekly_summary', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="XP e badges"
            subtitle="Notificações de conquistas, nível e pontuação."
            value={prefs.notify_xp_and_badges}
            onChange={(value) => update('notify_xp_and_badges', value)}
            disabled={!prefs.notifications_enabled}
          />
        </Card>

        {message ? (
          <View className="mt-3 rounded-xl px-3 py-2 bg-emerald-50 border border-emerald-200">
            <Text className="text-emerald-700 text-sm">{message}</Text>
          </View>
        ) : null}
      </View>
    </Layout>
  );
};

export default NotificationSettings;




