import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Layout from '../../components/Layout';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { createAppRating, getMyAppRating } from '../../services/appRatings';
import { AppRatingDimensionKey } from '../../types/appRating';
import useBackToProfile from '../../hooks/useBackToProfile';

type FeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const initialRatings: Record<AppRatingDimensionKey, number | null> = {
  usability_rating: null,
  helpfulness_rating: null,
  calendar_rating: null,
  alerts_rating: null,
  goals_rating: null,
  reports_rating: null,
  records_rating: null,
};

const ratingFields: Array<{ key: AppRatingDimensionKey; title: string; subtitle: string }> = [
  { key: 'usability_rating', title: 'Usabilidade', subtitle: 'Facilidade para navegar e concluir tarefas.' },
  { key: 'helpfulness_rating', title: 'Utilidade geral', subtitle: 'Quanto o app ajuda no seu controle financeiro.' },
  { key: 'calendar_rating', title: 'Calendário', subtitle: 'Visualização e acompanhamento por datas.' },
  { key: 'alerts_rating', title: 'Avisos', subtitle: 'Qualidade e clareza das notificações.' },
  { key: 'goals_rating', title: 'Metas', subtitle: 'Criação e acompanhamento de objetivos.' },
  { key: 'reports_rating', title: 'Relatórios', subtitle: 'Leitura dos indicadores e resumo mensal.' },
  { key: 'records_rating', title: 'Lançamentos', subtitle: 'Cadastro e atualização de ganhos/dívidas.' },
];

const AppRating = () => {
  const { darkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();

  const [ratings, setRatings] = useState<Record<AppRatingDimensionKey, number | null>>(initialRatings);
  const [suggestions, setSuggestions] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  const allDimensionsRated = useMemo(
    () => ratingFields.every((field) => typeof ratings[field.key] === 'number' && (ratings[field.key] as number) >= 1),
    [ratings]
  );

  const loadMyRating = useCallback(async () => {
    setLoadingData(true);
    try {
      const current = await getMyAppRating();
      if (current) {
        setRatings({
          usability_rating: current.usability_rating,
          helpfulness_rating: current.helpfulness_rating,
          calendar_rating: current.calendar_rating,
          alerts_rating: current.alerts_rating,
          goals_rating: current.goals_rating,
          reports_rating: current.reports_rating,
          records_rating: current.records_rating,
        });
        setSuggestions(current.suggestions || '');
      } else {
        setRatings(initialRatings);
        setSuggestions('');
      }
      setFeedback(null);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível carregar sua avaliação agora.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMyRating();
  }, [loadMyRating]);

  const setFieldRating = (key: AppRatingDimensionKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    if (feedback?.kind === 'error') {
      setFeedback(null);
    }
  };

  const handleSubmit = async () => {
    if (!allDimensionsRated || submitting) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await createAppRating({
        usability_rating: ratings.usability_rating as number,
        helpfulness_rating: ratings.helpfulness_rating as number,
        calendar_rating: ratings.calendar_rating as number,
        alerts_rating: ratings.alerts_rating as number,
        goals_rating: ratings.goals_rating as number,
        reports_rating: ratings.reports_rating as number,
        records_rating: ratings.records_rating as number,
        suggestions: suggestions.trim() ? suggestions.trim() : undefined,
      });

      setFeedback({ kind: 'success', message: result.message });
      await loadMyRating();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível salvar sua avaliação agora.';
      setFeedback({ kind: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Avaliar aplicativo</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Sua avaliação é única e pode ser atualizada quando quiser.
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: largerTouchTargets ? 128 : 112 }}
      >
        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Como você avalia cada área?</AppText>
            {loadingData ? <ActivityIndicator color="#f48c25" /> : null}
          </View>

          {ratingFields.map((field, index) => (
            <View
              key={field.key}
              className={`${index !== ratingFields.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''} py-3`}
            >
              <AppText className="text-slate-900 dark:text-slate-100 font-semibold">{field.title}</AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{field.subtitle}</AppText>
              <View className="flex-row mt-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const selected = (ratings[field.key] || 0) >= starValue;
                  return (
                    <TouchableOpacity
                      key={`${field.key}-${starValue}`}
                      onPress={() => setFieldRating(field.key, starValue)}
                      className="mr-2 items-center justify-center"
                      style={{ minWidth: rowHeight, minHeight: rowHeight }}
                      accessibilityRole="button"
                      accessibilityLabel={`${field.title}: ${starValue} estrela(s)`}
                    >
                      <Star
                        size={24}
                        color={selected ? '#f48c25' : '#94a3b8'}
                        fill={selected ? '#f48c25' : 'transparent'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>

        <Card className="p-4 mb-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-1">Sugestões (opcional)</AppText>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs mb-2">
            Escreva melhorias que podem facilitar seu uso no dia a dia.
          </AppText>
          <AppTextInput
            multiline
            numberOfLines={4}
            maxLength={1000}
            value={suggestions}
            onChangeText={setSuggestions}
            placeholder="Digite sua sugestão..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 text-slate-900 dark:text-slate-100"
            style={{ minHeight: Math.max(112, rowHeight * 2) }}
          />
          <AppText className="text-[11px] text-slate-400 dark:text-slate-300 mt-1">{suggestions.length}/1000</AppText>
          <Button
            title={submitting ? 'Salvando...' : 'Salvar avaliação'}
            loading={submitting}
            disabled={!allDimensionsRated || submitting}
            onPress={handleSubmit}
            className="h-11 mt-3"
          />
          {!allDimensionsRated ? (
            <AppText className="text-[11px] text-slate-500 dark:text-slate-200 mt-2">
              Marque todas as 7 áreas com estrelas para salvar.
            </AppText>
          ) : null}
        </Card>

        {feedback ? (
          <View
            className={`mb-3 rounded-xl border px-3 py-2 ${
              feedback.kind === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <AppText
              className={`text-sm ${
                feedback.kind === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              }`}
            >
              {feedback.message}
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </Layout>
  );
};

export default AppRating;
