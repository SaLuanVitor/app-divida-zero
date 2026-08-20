import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useThemeMode } from '../../context/ThemeContext';
import { useBottomInset } from '../../context/BottomInsetContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { listPendingInvitations, acceptInvitation, declineInvitation } from '../../services/household';
import { PendingInvitation } from '../../types/household';

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR');
};

const ConvitesPendentes = () => {
  const { darkMode } = useThemeMode();
  const { contentBottomInset } = useBottomInset();
  const goBackToProfile = useBackToProfile();
  const navigation = useNavigation<any>();

  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await listPendingInvitations();
      setInvitations(data.invitations);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleAccept = async (token: string) => {
    setActionLoading(token);
    try {
      await acceptInvitation(token);
      setInvitations((prev) => prev.filter((i) => i.token !== token));
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (token: string) => {
    setActionLoading(token);
    try {
      await declineInvitation(token);
      setInvitations((prev) => prev.filter((i) => i.token !== token));
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Layout contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
      <View style={{ paddingBottom: contentBottomInset }}>
        <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
              <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
            </TouchableOpacity>
            <View className="flex-1 pr-1">
              <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Convites pendentes</AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs">Aceite ou recuse convites de família.</AppText>
            </View>
          </View>
        </View>

        <View className="p-4" style={{ gap: 12 }}>
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#f48c25" />
            </View>
          ) : invitations.length === 0 ? (
            <Card className="p-6 items-center">
              <AppText className="text-slate-500 text-center">
                Nenhum convite pendente.
              </AppText>
            </Card>
          ) : (
            invitations.map((invite) => (
              <Card key={invite.token} className="p-4" style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">
                    {invite.household_name}
                  </AppText>
                  <AppText className="text-slate-500 text-xs">
                    Convidado por {invite.invited_by} em {formatDate(invite.created_at)}
                  </AppText>
                  <AppText className="text-slate-400 text-[11px]">
                    Expira em {formatDate(invite.expires_at)}
                  </AppText>
                </View>

                <View className="flex-row" style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleAccept(invite.token)}
                    disabled={actionLoading === invite.token}
                    className="flex-1 bg-green-500 p-3 rounded-lg flex-row items-center justify-center"
                    style={{ gap: 6, opacity: actionLoading === invite.token ? 0.6 : 1 }}
                  >
                    {actionLoading === invite.token ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Check size={16} color="#fff" />
                    )}
                    <AppText className="text-white font-bold">Aceitar</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDecline(invite.token)}
                    disabled={actionLoading === invite.token}
                    className="flex-1 bg-red-500 p-3 rounded-lg flex-row items-center justify-center"
                    style={{ gap: 6, opacity: actionLoading === invite.token ? 0.6 : 1 }}
                  >
                    <X size={16} color="#fff" />
                    <AppText className="text-white font-bold">Recusar</AppText>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>
      </View>
    </Layout>
  );
};

export default ConvitesPendentes;
