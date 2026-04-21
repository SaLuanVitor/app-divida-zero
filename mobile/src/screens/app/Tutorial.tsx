import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ArrowLeft, Lightbulb } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { useTutorial } from '../../context/TutorialContext';

const Tutorial = () => {
  const navigation = useNavigation<any>();
  const { darkMode } = useThemeMode();
  const {
    startBeginnerTutorial,
    beginnerCompleted,
    tutorialTrackState,
    tutorialDeviceClass,
  } = useTutorial();

  const statusLabel =
    tutorialTrackState === 'essential'
      ? 'Etapa essencial em andamento'
      : tutorialTrackState === 'completed'
      ? 'Trilha concluida'
      : tutorialTrackState === 'paused'
      ? 'Trilha pausada'
      : 'Trilha inativa';

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#121212]">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Tutorial adaptativo</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Status atual: {statusLabel}</AppText>
          </View>
        </View>
      </View>

      <View className="p-4">
        <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Lightbulb size={18} color="#f48c25" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Etapa essencial</AppText>
          </View>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-3">
            Sequencia guiada com spotlight hibrido e fallback automatico para telas compactas, padrao e grandes.
          </AppText>
          <AppText
            className={`text-xs font-bold mb-3 ${
              beginnerCompleted ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'
            }`}
          >
            {beginnerCompleted ? 'Status: concluida' : 'Status: pendente'}
          </AppText>
          <Button
            title={beginnerCompleted ? 'Refazer etapa essencial' : 'Iniciar etapa essencial'}
            onPress={async () => {
              await startBeginnerTutorial({ replay: true });
              navigation.navigate('Inicio');
            }}
            className="h-11"
          />
        </View>

        <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold">Compatibilidade de dispositivo</AppText>
          <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-1">
            Classe detectada neste aparelho: {tutorialDeviceClass}.
          </AppText>
        </View>
      </View>
    </Layout>
  );
};

export default Tutorial;
