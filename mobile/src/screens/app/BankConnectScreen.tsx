import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Landmark } from 'lucide-react-native';
import { PluggyConnect } from 'react-native-pluggy-connect';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import { useThemeMode } from '../../context/ThemeContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { financialConnectionsApi } from '../../services/financialConnections';

type ConnectPhase = 'loading' | 'error' | 'ready' | 'success';

const BankConnectScreen = () => {
  const { darkMode } = useThemeMode();
  const goBackToProfile = useBackToProfile();
  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';

  const [phase, setPhase] = useState<ConnectPhase>('loading');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startConnection = useCallback(async () => {
    try {
      const { data } = await financialConnectionsApi.create();
      setConnectionId(data.connection.id);
      setConnectToken(data.connect_token);
      setPhase('ready');
    } catch (error: any) {
      setPhase('error');
      setErrorMessage(
        error?.response?.data?.error || error?.response?.data?.message || 'Falha ao iniciar a conexão.'
      );
    }
  }, []);

  useEffect(() => {
    startConnection();
  }, [startConnection]);

  const retryConnection = useCallback(() => {
    setPhase('loading');
    setErrorMessage(null);
    startConnection();
  }, [startConnection]);

  const handleOnOpen = useCallback(() => {
    // Widget aberto
  }, []);

  const handleOnSuccess = useCallback((_data: { item: { id: string } }) => {
    setConnectToken(null);
    setPhase('success');
  }, []);

  const handleOnError = useCallback((error: { message: string }) => {
    setConnectToken(null);
    setPhase('error');
    setErrorMessage(error?.message || 'Não foi possível conectar o banco.');
  }, []);

  const handleOnClose = useCallback(() => {
    // Usuário fechou o widget sem concluir
    setConnectToken(null);
    goBackToProfile();
  }, [goBackToProfile]);

  if (phase === 'loading') {
    return (
      <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black">
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#3b82f6" />
          <AppText className="mt-4 text-slate-600 dark:text-slate-200">
            Preparando conexão segura...
          </AppText>
        </View>
      </Layout>
    );
  }

  if (phase === 'error') {
    return (
      <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">
            Conectar banco
          </AppText>
        </View>

        <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 mb-4">
          <AppText className="text-red-700 dark:text-red-300">{errorMessage}</AppText>
        </View>

        <TouchableOpacity
          className="bg-blue-500 py-4 px-6 rounded-xl items-center"
          onPress={retryConnection}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <AppText className="text-white font-semibold text-lg">Tentar novamente</AppText>
        </TouchableOpacity>
      </Layout>
    );
  }

  if (phase === 'success') {
    return (
      <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-4">
        <View className="items-center py-12">
          <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 items-center justify-center mb-4">
            <Landmark size={28} color="#22c55e" />
          </View>
          <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-2">
            Banco conectado!
          </AppText>
          <AppText className="text-slate-500 dark:text-slate-200 text-center mb-6">
            {connectionId
              ? 'Estamos sincronizando seus extratos. Isso pode levar alguns instantes.'
              : 'Sua conexão foi concluída com sucesso.'}
          </AppText>
          <TouchableOpacity
            className="bg-blue-500 py-4 px-6 rounded-xl items-center w-full"
            onPress={goBackToProfile}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <AppText className="text-white font-semibold text-lg">Voltar</AppText>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  // phase === 'ready' com token disponível
  if (!connectToken) {
    return null;
  }

  // O widget da Pluggy mede a viewport inteira e nao tem scroll proprio, entao
  // ele precisa da tela cheia: fora da tab bar e apenas com os insets de safe area.
  return (
    <View style={styles.fullscreen}>
      <PluggyConnect
        connectToken={connectToken}
        includeSandbox={false}
        language="pt"
        theme={darkMode ? 'dark' : 'light'}
        onOpen={handleOnOpen}
        onClose={handleOnClose}
        onSuccess={handleOnSuccess}
        onError={handleOnError}
      />

      {/*
        Saida de emergencia: o widget cobre a tela toda e o botao de fechar dele
        fica no topo. Este botao garante que o usuario nunca fique preso caso o
        widget falhe em carregar.
      */}
      <SafeAreaView
        edges={['top']}
        style={styles.overlayHeader}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={handleOnClose}
          className="p-2 -ml-2"
          accessibilityRole="button"
          accessibilityLabel="Fechar conexao bancaria"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={iconColor} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 16,
  },
});

export default BankConnectScreen;
