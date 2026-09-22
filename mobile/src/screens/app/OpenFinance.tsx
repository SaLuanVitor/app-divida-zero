import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileUp, ListChecks, RefreshCw, Landmark } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { controlHeight, textClampLines } from '../../utils/responsive';

const ActionRow = ({
  icon,
  color,
  title,
  subtitle,
  onPress,
  disabled,
  rowMinHeight,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  rowMinHeight: number;
}) => {
  const Icon = icon;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center p-4 border-b border-slate-100 dark:border-slate-800 ${disabled ? 'opacity-50' : ''}`}
      style={{ minHeight: rowMinHeight }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1 ml-3">
        <AppText className="text-slate-900 dark:text-slate-100 font-semibold" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{title}</AppText>
        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{subtitle}</AppText>
      </View>
      <AppText className="text-slate-400 dark:text-slate-500">›</AppText>
    </TouchableOpacity>
  );
};

const OpenFinance = () => {
  const { darkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();
  const navigation = useNavigation<any>();
  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';
  const rowMinHeight = controlHeight(fontScale, largerTouchTargets, 48, { minTouchHeight: 48 });

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Open Finance</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Importe seus extratos bancários
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="mb-3 p-4">
          <View className="flex-row items-center mb-1">
            <Landmark size={18} color="#3b82f6" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">
              Importação manual
            </AppText>
          </View>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs">
            Exporte o extrato do seu banco (OFX ou CSV) e importe aqui. Sem custo e sem conexão direta.
          </AppText>
        </Card>

        <Card className="mb-3">
          <ActionRow
            icon={FileUp}
            color="#3b82f6"
            title="Importar extrato"
            subtitle="Envie um arquivo OFX, QFX ou CSV."
            onPress={() => navigation.navigate('BankImport')}
            rowMinHeight={rowMinHeight}
          />
          <ActionRow
            icon={ListChecks}
            color="#22c55e"
            title="Revisar transações"
            subtitle="Confira e aceite as transações importadas."
            onPress={() => navigation.navigate('BankReview')}
            rowMinHeight={rowMinHeight}
          />
        </Card>

        <Card className="p-4">
          <View className="flex-row items-center mb-1">
            <RefreshCw size={18} color="#94a3b8" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">
              Sincronização automática
            </AppText>
          </View>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs">
            Em breve. A conexão automática com o banco ainda não está disponível nesta versão.
          </AppText>
        </Card>
      </View>
    </Layout>
  );
};

export default OpenFinance;
