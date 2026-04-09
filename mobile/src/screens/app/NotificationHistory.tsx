import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CircleAlert,
  Info,
  Target,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import { runWhenIdle } from '../../utils/idle';
import {
  listNotificationHistory,
  markNotificationHistorySeen,
} from '../../services/notificationCenter';
import { NotificationHistoryItem } from '../../types/notificationCenter';
import { useThemeMode } from '../../context/ThemeContext';
import { useBottomInset } from '../../context/BottomInsetContext';
import useBackToProfile from '../../hooks/useBackToProfile';

type HistoryFilter = 'all' | 'unread';

const kindIconMap: Record<
  NotificationHistoryItem['kind'],
  React.ComponentType<{ size?: number; color?: string }>
> = {
  achievement: Trophy,
  goal: Target,
  record: Wallet,
  reminder: CircleAlert,
  system: Info,
};

const kindColorMap: Record<NotificationHistoryItem['kind'], string> = {
  achievement: '#f48c25',
  goal: '#0ea5e9',
  record: '#22c55e',
  reminder: '#ef4444',
  system: '#64748b',
};

const NotificationHistory = () => {
  const { darkMode } = useThemeMode();
  const { contentBottomInset } = useBottomInset();
  const goBackToProfile = useBackToProfile();
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const loadHistory = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    setLoading(true);
    try {
      const history = await listNotificationHistory({ force });
      setItems(history);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cancel = runWhenIdle(() => {
        loadHistory({ force: true });
      });
      return cancel;
    }, [loadHistory])
  );

  useEffect(() => {
    if (!items.length || unreadCount === 0) return;

    markNotificationHistorySeen().catch(() => {});
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }, [items, unreadCount]);

  const visibleItems = useMemo(() => {
    if (filter === 'unread') {
      return items.filter((item) => !item.read);
    }
    return items;
  }, [filter, items]);

  return (
    <Layout contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentBottomInset }}
      >
        <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity
              onPress={goBackToProfile}
              className="p-2 -ml-2 mr-1"
            >
              <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#334155'} />
            </TouchableOpacity>
            <View className="flex-1">
              <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">
                Histórico de notificações
              </AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs">
                Atualizações importantes da sua jornada no app.
              </AppText>
            </View>
            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
              <Bell size={16} color="#f48c25" />
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-2">
            <TouchableOpacity
              className={`px-3 py-2 rounded-full border ${
                filter === 'all'
                  ? 'bg-primary border-primary'
                  : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
              }`}
              onPress={() => setFilter('all')}
            >
              <AppText
                className={`text-xs font-bold ${
                  filter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-200'
                }`}
              >
                Todas
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-2 rounded-full border ${
                filter === 'unread'
                  ? 'bg-primary border-primary'
                  : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
              }`}
              onPress={() => setFilter('unread')}
            >
              <AppText
                className={`text-xs font-bold ${
                  filter === 'unread' ? 'text-white' : 'text-slate-600 dark:text-slate-200'
                }`}
              >
                Não lidas
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-3 py-2 rounded-full border bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700"
              onPress={async () => {
                await markNotificationHistorySeen();
                setItems((current) => current.map((item) => ({ ...item, read: true })));
              }}
            >
              <View className="flex-row items-center">
                <CheckCheck size={12} color={darkMode ? '#cbd5e1' : '#475569'} />
                <AppText className="text-xs font-bold text-slate-600 dark:text-slate-200 ml-1">
                  Marcar lidas
                </AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#f48c25" />
              <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                Carregando notificações...
              </AppText>
            </View>
          ) : null}

          {!loading && visibleItems.length === 0 ? (
            <Card noPadding>
              <View className="p-4">
                <AppText className="text-slate-600 dark:text-slate-200 text-sm">
                  Não existem notificações.
                </AppText>
              </View>
            </Card>
          ) : null}

          {visibleItems.map((item) => {
            const Icon = kindIconMap[item.kind] || Bell;
            const iconColor = kindColorMap[item.kind] || '#64748b';
            const createdLabel = new Date(item.created_at).toLocaleString('pt-BR');

            return (
              <Card key={item.id} className="mb-3" noPadding>
                <View className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row flex-1 pr-2">
                      <View className="w-10 h-10 rounded-lg items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <Icon size={18} color={iconColor} />
                      </View>
                      <View className="ml-3 flex-1">
                        <AppText className="text-slate-900 dark:text-slate-100 font-bold">
                          {item.title}
                        </AppText>
                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-1">
                          {item.message}
                        </AppText>
                        <AppText className="text-slate-400 dark:text-slate-200 text-[11px] mt-2">
                          {createdLabel}
                        </AppText>
                      </View>
                    </View>
                    {!item.read ? (
                      <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Layout>
  );
};

export default NotificationHistory;

