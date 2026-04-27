import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { CreditCard, Lock, Quote } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

type LoginRouteParams = {
  prefillEmail?: string;
  infoMessage?: string;
};

const Login = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { darkMode } = useThemeMode();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const { signIn, authLoading } = useAuth();

  useEffect(() => {
    const params = (route.params ?? {}) as LoginRouteParams;

    if (params.prefillEmail) {
      setLogin(params.prefillEmail);
    }

    if (params.infoMessage) {
      setInfoMessage(params.infoMessage);
    }
  }, [route.params]);

  const validate = () => {
    let valid = true;

    if (!login.trim()) {
      setLoginError('Informe seu login do usu\u00E1rio.');
      valid = false;
    } else {
      setLoginError('');
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
      await signIn(login.trim(), password);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Falha na autentica\u00E7\u00E3o. Verifique suas credenciais e tente novamente.';
      setAuthError(message);
      setPasswordError('Verifique sua senha e tente novamente.');
    }
  };

  return (
    <Layout scrollable formMode contentContainerClassName="p-0 bg-[#f5eee6] dark:bg-black">
      <View className="px-6 pt-8 pb-4">
        <View className="items-center justify-center mb-8">
          <BrandLogo
            variant="lockup"
            size={64}
            titleColor={darkMode ? '#e2e8f0' : '#4a2a0a'}
            subtitleColor={darkMode ? '#94a3b8' : '#8a5a24'}
          />
        </View>

        <View className="mb-6">
          <View className="flex-row items-start">
            <View className="w-8 h-8 rounded-full bg-[#f1dca6] items-center justify-center mr-2 mt-1">
              <Quote size={13} color="#8a5a24" />
            </View>
            <AppText className="flex-1 text-[15px] leading-[22px] font-semibold text-[#7a4c1e] dark:text-slate-100">
              {'O primeiro passo para o '}
              <AppText className="text-primary">sucesso financeiro</AppText>
              {' \u00E9 decidir que voc\u00EA n\u00E3o vai mais ser um passageiro da sua pr\u00F3pria vida.'}
            </AppText>
          </View>
        </View>

        <View className="rounded-[34px] bg-white dark:bg-[#121212] border border-[#efe6dd] dark:border-slate-700 px-6 py-6">
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
            label={'Login do Usu\u00E1rio'}
            placeholder="seu@login"
            value={login}
            onChangeText={(value) => {
              setLogin(value);
              if (loginError) setLoginError('');
              if (authError) setAuthError('');
            }}
            icon={CreditCard}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            error={loginError}
            containerClassName="mb-5"
            className="text-[#7a5a35] dark:text-slate-100"
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
            containerClassName="mb-6"
            className="text-[#7a5a35] dark:text-slate-100"
          />

          <Button title="Entrar" onPress={handleLogin} loading={authLoading} disabled={authLoading} />
        </View>

        <View className="mt-8 flex-row justify-center items-center pb-10">
          <AppText className="text-[#7a4c1e] dark:text-slate-200 text-lg">{'N\u00E3o tem uma conta? '}</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <AppText className="text-[#8a4c00] dark:text-primary font-bold text-lg">Cadastre-se</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Layout>
  );
};

export default Login;
