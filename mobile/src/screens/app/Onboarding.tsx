import React, { useEffect, useState } from 'react';
import AppText from '../../components/AppText';
import { TouchableOpacity, View } from 'react-native';
import { Lightbulb, ShieldCheck, Wallet, Target, BarChart3 } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { updateAppPreferences } from '../../services/preferences';
import { trackAnalyticsEventDeferred } from '../../services/analytics';
import { AppPreferences } from '../../types/settings';

type OnboardingProps = {
  onDone: () => void;
};

const Onboarding = ({ onDone }: OnboardingProps) => {
  const [loading, setLoading] = useState(false);
  const [showAdvancedQuickGuide, setShowAdvancedQuickGuide] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState<AppPreferences['onboarding_primary_goal']>('organize_month');

  useEffect(() => {
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_viewed',
      screen: 'Onboarding',
    });
  }, []);

  const complete = async (
    mode: 'beginner' | 'advanced' | 'skip',
    options?: { advancedQuickGuideSeen?: boolean }
  ) => {
    if (loading) return;
    setLoading(true);

    const eventName = mode === 'skip' ? 'onboarding_skipped' : 'onboarding_completed';

    try {
      const isBeginner = mode === 'beginner';
      const isAdvanced = mode === 'advanced';
      const isSkip = mode === 'skip';

      await updateAppPreferences({
        onboarding_seen: true,
        onboarding_mode: isAdvanced ? 'advanced' : isBeginner ? 'beginner' : null,
        onboarding_primary_goal: primaryGoal,
        advanced_quick_guide_seen: Boolean(options?.advancedQuickGuideSeen),
        first_success_milestone_done: false,
        tutorial_reopen_enabled: isBeginner,
        tutorial_active_mode: isBeginner ? 'beginner' : null,
        tutorial_beginner_completed: isAdvanced,
        tutorial_advanced_completed: isAdvanced,
        tutorial_last_step: isBeginner ? 'home_summary' : null,
        tutorial_advanced_tasks_done: [],
        tutorial_version: 2,
        tutorial_track_state: isBeginner ? 'essential' : isAdvanced ? 'completed' : 'paused',
        tutorial_missions_done: [],
      });

      trackAnalyticsEventDeferred({
        event_name: eventName,
        screen: 'Onboarding',
        metadata: {
          mode: mode === 'skip' ? 'skipped' : mode === 'advanced' ? 'advanced_no_tutorial' : 'adaptive',
          primary_goal: primaryGoal ?? 'none',
          advanced_quick_guide_seen: Boolean(options?.advancedQuickGuideSeen),
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
          Vamos usar uma trilha essencial e adaptativa para te guiar nas primeiras acoes.
        </AppText>
      </View>

      {showAdvancedQuickGuide ? (
        <View className="px-5 pb-10">
          <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4 mb-4">
            <View className="flex-row items-center mb-2">
              <Lightbulb size={18} color="#f48c25" />
              <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Guia rápido do modo avançado</AppText>
            </View>
            <AppText className="text-slate-600 dark:text-slate-200 text-xs leading-5">
              Início: visão geral, calendário e próximos passos.
            </AppText>
            <AppText className="text-slate-600 dark:text-slate-200 text-xs leading-5 mt-1">
              Lançamentos e Metas: registre movimentações e acompanhe evolução.
            </AppText>
            <AppText className="text-slate-600 dark:text-slate-200 text-xs leading-5 mt-1">
              Relatórios e Perfil: filtre indicadores e ajuste preferências da conta.
            </AppText>
          </View>

          <Button
            title="Entrar no app"
            loading={loading}
            disabled={loading}
            onPress={() => complete('advanced', { advancedQuickGuideSeen: true })}
            className="h-12 mb-3"
          />
          <Button
            title="Voltar"
            variant="outline"
            disabled={loading}
            onPress={() => setShowAdvancedQuickGuide(false)}
            className="h-11"
          />
        </View>
      ) : (
        <>
          <View className="px-5 pb-6">
            <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4 mb-3">
              <View className="flex-row items-center">
                <Lightbulb size={18} color="#f48c25" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Como o app funciona</AppText>
              </View>
              <View className="mt-2">
                <View className="flex-row items-center">
                  <Wallet size={14} color="#f48c25" />
                  <AppText className="text-slate-600 dark:text-slate-200 text-xs ml-2">Lançamentos: registre ganhos e dívidas rapidamente.</AppText>
                </View>
                <View className="flex-row items-center mt-2">
                  <Target size={14} color="#f48c25" />
                  <AppText className="text-slate-600 dark:text-slate-200 text-xs ml-2">Metas: acompanhe evolução e progresso mensal.</AppText>
                </View>
                <View className="flex-row items-center mt-2">
                  <BarChart3 size={14} color="#f48c25" />
                  <AppText className="text-slate-600 dark:text-slate-200 text-xs ml-2">Relatórios: visualize indicadores e filtros por período.</AppText>
                </View>
              </View>
            </View>

            <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold">Qual seu foco agora?</AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1 mb-3">Escolha uma opção para personalizar a recomendação inicial.</AppText>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 'organize_month', label: 'Organizar mês' },
                  { value: 'pay_off_debt', label: 'Quitar dívida' },
                  { value: 'create_goal', label: 'Criar meta' },
                ].map((option) => {
                  const selected = primaryGoal === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      className={`px-3 py-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                      onPress={() => setPrimaryGoal(option.value as AppPreferences['onboarding_primary_goal'])}
                    >
                      <AppText className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="px-5 pb-10">
            <Button title="Modo iniciante (com tutorial)" loading={loading} disabled={loading} onPress={() => complete('beginner')} className="h-12 mb-3" />
            <Button
              title="Modo avançado (sem tutorial)"
              variant="outline"
              disabled={loading}
              onPress={() => setShowAdvancedQuickGuide(true)}
              className="h-11 mb-3"
            />
            <Button title="Pular por enquanto" variant="ghost" disabled={loading} onPress={() => complete('skip')} className="h-11" />
          </View>
        </>
      )}
    </Layout>
  );
};

export default Onboarding;
