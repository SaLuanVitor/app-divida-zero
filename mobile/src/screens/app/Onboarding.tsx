import React, { useEffect, useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity } from 'react-native';
import { Lightbulb, Rocket, ShieldCheck } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { updateAppPreferences } from '../../services/preferences';
import { trackAnalyticsEventDeferred } from '../../services/analytics';

type OnboardingProps = {
  onDone: () => void;
};

type OnboardingMode = 'beginner' | 'advanced';

const Onboarding = ({ onDone }: OnboardingProps) => {
  const [selectedMode, setSelectedMode] = useState<OnboardingMode>('beginner');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_viewed',
      screen: 'Onboarding',
    });
  }, []);

  const modeTitle = useMemo(() => {
    if (selectedMode === 'advanced') return 'Modo experiente';
    return 'Modo iniciante';
  }, [selectedMode]);

  const complete = async (skip: boolean) => {
    if (loading) return;
    setLoading(true);

    const mode = skip ? null : selectedMode;
    const eventName = skip ? 'onboarding_skipped' : 'onboarding_completed';

    try {
      await updateAppPreferences({
        onboarding_seen: true,
        onboarding_mode: mode,
        tutorial_reopen_enabled: true,
        tutorial_beginner_completed: mode === 'beginner' ? false : undefined,
        tutorial_advanced_completed: mode === 'advanced' ? false : undefined,
        tutorial_last_step: mode === 'beginner' ? 'home_summary' : null,
        tutorial_advanced_tasks_done: mode === 'advanced' ? [] : undefined,
      });

      trackAnalyticsEventDeferred({
        event_name: eventName,
        screen: 'Onboarding',
        metadata: {
            mode: mode || 'skipped',
        },
      });

      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
      <View className="px-5 pt-8 pb-4">
        <View className="w-14 h-14 rounded-full bg-primary/15 items-center justify-center mb-4">
          <ShieldCheck size={28} color="#f48c25" />
        </View>
        <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-extrabold">Bem-vindo ao Dívida Zero</AppText>
        <AppText className="text-slate-600 dark:text-slate-200 text-sm mt-2">
          Escolha um perfil para iniciar. Você pode pular agora e reabrir o tutorial depois em Configurações do app.
        </AppText>
      </View>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={() => setSelectedMode('beginner')}
          className={`rounded-2xl border p-4 mb-3 ${
            selectedMode === 'beginner'
              ? 'bg-primary/10 border-primary'
              : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
          }`}
        >
          <View className="flex-row items-center">
            <Lightbulb size={18} color={selectedMode === 'beginner' ? '#f48c25' : '#64748b'} />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Iniciante em finanças</AppText>
          </View>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-2">
            Passos guiados, linguagem mais simples e foco nas primeiras ações.
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedMode('advanced')}
          className={`rounded-2xl border p-4 ${
            selectedMode === 'advanced'
              ? 'bg-primary/10 border-primary'
              : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
          }`}
        >
          <View className="flex-row items-center">
            <Rocket size={18} color={selectedMode === 'advanced' ? '#f48c25' : '#64748b'} />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Usuário experiente</AppText>
          </View>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-2">
            Fluxo mais direto e foco em produtividade para controlar metas e lançamentos.
          </AppText>
        </TouchableOpacity>
      </View>

      <View className="px-5 pb-10">
        <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold">{modeTitle}</AppText>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-1">
            O app vai usar esse perfil para priorizar dicas e orientar sua evolução.
          </AppText>
        </View>

        <Button title="Começar com este perfil" loading={loading} disabled={loading} onPress={() => complete(false)} className="h-12 mb-3" />
        <Button title="Pular tutorial por enquanto" variant="outline" disabled={loading} onPress={() => complete(true)} className="h-11" />
      </View>
    </Layout>
  );
};

export default Onboarding;


