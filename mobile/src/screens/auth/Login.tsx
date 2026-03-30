import React, { useEffect, useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, Image, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

type LoginRouteParams = {
  prefillEmail?: string;
  infoMessage?: string;
};

const Login = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const { signIn, authLoading } = useAuth();

  useEffect(() => {
    const params = (route.params ?? {}) as LoginRouteParams;

    if (params.prefillEmail) {
      setEmail(params.prefillEmail);
    }

    if (params.infoMessage) {
      setInfoMessage(params.infoMessage);
    }
  }, [route.params]);

  const heroHeight = useMemo(() => {
    if (width < 360) return 200;
    if (width < 420) return 220;
    return 250;
  }, [width]);

  const validate = () => {
    let valid = true;

    if (!email.trim()) {
      setEmailError('Informe seu usuário.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Informe sua senha.');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  };

  const handleLogin = async () => {
    setInfoMessage('');
    setAuthError('');

    if (!validate()) {
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Falha na autenticação. Verifique suas credenciais e tente novamente.';
      setAuthError(message);
      setPasswordError('Verifique sua senha e tente novamente.');
      Alert.alert('Não foi possível entrar', message);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
      <View className="px-4 pt-4 pb-2 bg-[#f8f7f5] dark:bg-black">
        <AppText className="text-slate-900 dark:text-slate-100 text-center text-lg font-bold">Dívida Zero</AppText>
      </View>

      <View className="px-4 pb-2 bg-[#f8f7f5] dark:bg-black">
        <View className="relative w-full bg-orange-100 dark:bg-[#1a1a1a] overflow-hidden rounded-2xl" style={{ height: heroHeight }}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop' }}
            className="w-full h-full opacity-80"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/40" />
          <View className="absolute bottom-6 left-6 right-6">
            <AppText className="text-white text-3xl font-bold">Assuma o controle</AppText>
            <AppText className="text-white/90 text-sm mt-1">Gamifique suas finanças e zere suas dívidas.</AppText>
          </View>
        </View>
      </View>

      <View className="px-6 py-5 bg-[#f8f7f5] dark:bg-black">
        <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-bold text-center">
          Bem-vindo de volta!
        </AppText>
        <AppText className="text-slate-500 dark:text-slate-300 text-center mt-2 mb-5">
          Digite suas credenciais para continuar sua jornada.
        </AppText>

        {infoMessage ? (
          <View className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
            <AppText className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{infoMessage}</AppText>
          </View>
        ) : null}

        {authError ? (
          <View className="mb-4 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
            <AppText className="text-red-700 dark:text-red-300 text-sm font-medium">{authError}</AppText>
          </View>
        ) : null}

        <Input
          label="Usuário"
          placeholder="usuario"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError('');
            if (authError) setAuthError('');
          }}
          icon={Mail}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          error={emailError}
        />

        <Input
          label="Senha"
          placeholder="Insira sua senha"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (passwordError) setPasswordError('');
            if (authError) setAuthError('');
          }}
          icon={Lock}
          secureTextEntry
          error={passwordError}
        />

        <View className="items-end mb-6">
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <AppText className="text-primary font-semibold">Esqueci minha senha</AppText>
          </TouchableOpacity>
        </View>

        <Button
          title="Entrar"
          onPress={handleLogin}
          loading={authLoading}
          disabled={authLoading}
          className="mt-1"
        />

        <View className="mt-10 items-center">
          <AppText className="text-slate-400 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            Motivação do dia
          </AppText>
          <AppText className="text-slate-600 dark:text-slate-300 italic text-center text-sm mt-2 px-4">
            "Pequenos passos todos os dias levam a grandes conquistas financeiras."
          </AppText>
        </View>

        <View className="mt-8 flex-row justify-center items-center pb-8">
          <AppText className="text-slate-500 dark:text-slate-300 text-sm">Não tem uma conta? </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <AppText className="text-primary font-bold text-sm">Cadastre-se</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View className="h-2 w-full bg-primary/20" />
    </Layout>
  );
};

export default Login;

