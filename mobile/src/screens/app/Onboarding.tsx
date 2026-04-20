import React, { useEffect, useState } from 'react';
import AppText from '../../components/AppText';
import { View } from 'react-native';
import { Lightbulb, ShieldCheck, Target } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { updateAppPreferences } from '../../services/preferences';
import { trackAnalyticsEventDeferred } from '../../services/analytics';

type OnboardingProps = {
  onDone: () => void;
};

const Onboarding = ({ onDone }: OnboardingProps) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_viewed',
      screen: 'Onboarding',
    });
  }, []);

  const complete = async (skip: boolean) => {
    if (loading) return;
    setLoading(true);

    const eventName = skip ? 'onboarding_skipped' : 'onboarding_completed';

    try {
      await updateAppPreferences({
        onboarding_seen: true,
        onboarding_mode: 'beginner',
        tutorial_reopen_enabled: !skip,
        tutorial_active_mode: !skip ? 'beginner' : null,
        tutorial_beginner_completed: false,
        tutorial_advanced_completed: false,
        tutorial_last_step: !skip ? 'home_summary' : null,
        tutorial_advanced_tasks_done: [],
        tutorial_version: 2,
        tutorial_track_state: skip ? 'paused' : 'essential',
        tutorial_missions_done: [],
      });

      trackAnalyticsEventDeferred({
        event_name: eventName,
        screen: 'Onboarding',
        metadata: {
          mode: skip ? 'skipped' : 'adaptive',
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
        <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-extrabold">Bem-vindo ao Divida Zero</AppText>
        <AppText className="text-slate-600 dark:text-slate-200 text-sm mt-2">
          Vamos usar uma trilha unica e adaptativa para te guiar nas primeiras acoes e depois evoluir com missoes no fluxo real.
        </AppText>
      </View>

      <View className="px-5 pb-6">
        <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4 mb-3">
          <View className="flex-row items-center">
            <Lightbulb size={18} color="#f48c25" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Etapa essencial</AppText>
          </View>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-2">
            Passo a passo curto com foco nos atalhos mais importantes e fallback automatico para diferentes telas.
          </AppText>
        </View>

        <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4">
          <View className="flex-row items-center">
            <Target size={18} color="#0ea5e9" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Missoes contextuais</AppText>
          </View>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-2">
            Depois da etapa essencial, voce conclui missoes reais sem modal travando a navegacao.
          </AppText>
        </View>
      </View>

      <View className="px-5 pb-10">
        <Button title="Comecar tutorial adaptativo" loading={loading} disabled={loading} onPress={() => complete(false)} className="h-12 mb-3" />
        <Button title="Pular por enquanto" variant="outline" disabled={loading} onPress={() => complete(true)} className="h-11" />
      </View>
    </Layout>
  );
};

export default Onboarding;

