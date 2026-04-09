import React, { useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Alert } from 'react-native';
import { User, Lock, ArrowLeft, Sparkles } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

const getFirstError = (value: unknown) => {
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  if (typeof value === 'string') return value;
  return '';
};

const Register = () => {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();
  const { darkMode } = useThemeMode();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;

    if (!login.trim()) {
      setLoginError('Informe seu login do usuário.');
      valid = false;
    } else {
      setLoginError('');
    }

    if (!password) {
      setPasswordError('Informe sua senha.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Sua senha precisa ter ao menos 8 caracteres.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirme sua senha.');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('A confirmação da senha não confere.');
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const normalizedLogin = login.trim();

    setLoading(true);
    try {
      await signUp(normalizedLogin, normalizedLogin, password);

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: {
              prefillEmail: normalizedLogin,
              infoMessage: 'Conta criada com sucesso. Entre para continuar.',
            },
          },
        ],
      });
    } catch (error: any) {
      const data = error?.response?.data ?? {};
      const fieldErrors = data.field_errors ?? {};
      const backendCode = data.error_code;
      const backendMessage = data.error;

      const nameFieldError = getFirstError(fieldErrors.name);
      const emailFieldError = getFirstError(fieldErrors.email);
      const passwordFieldError = getFirstError(fieldErrors.password);

      if (nameFieldError || emailFieldError) {
        setLoginError(nameFieldError || emailFieldError);
      }
      if (passwordFieldError) {
        setPasswordError(passwordFieldError);
      }

      if (backendCode === 'email_taken') {
        Alert.alert('Usuário já cadastrado', backendMessage || 'Use outro login ou faça login com o usuário existente.');
        return;
      }

      const message = backendMessage ?? 'Falha ao criar conta. Tente novamente em instantes.';
      Alert.alert('Não foi possível criar sua conta', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable formMode contentContainerClassName="p-0 bg-[#f5eee6] dark:bg-black">
      <View className="px-6 pt-8 pb-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={24} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold">Cadastro</AppText>
        </View>

        <View className="mb-5 items-center">
          <View className="rounded-full px-3 py-1 bg-[#f6d870] border border-[#f0c94f] flex-row items-center">
            <Sparkles size={11} color="#7a4c1e" />
            <AppText className="text-[10px] ml-1 font-bold text-[#7a4c1e] uppercase">O primeiro passo é hoje</AppText>
          </View>
          <AppText className="text-center text-[#3b2c20] dark:text-slate-100 text-[32px] leading-[38px] font-extrabold mt-3">
            Crie sua conta e comece sua jornada
          </AppText>
        </View>

        <View className="rounded-[34px] bg-white dark:bg-[#121212] border border-[#efe6dd] dark:border-slate-700 px-6 py-6">
          <Input
            label="Nome do usuário"
            placeholder="Como deseja ser chamado?"
            value={login}
            onChangeText={(value) => {
              setLogin(value);
              if (loginError) setLoginError('');
            }}
            icon={User}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            error={loginError}
            containerClassName="mb-4"
            className="text-[#7a5a35] dark:text-slate-100"
          />

          <Input
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError('');
              if (confirmPasswordError) setConfirmPasswordError('');
            }}
            icon={Lock}
            secureTextEntry
            error={passwordError}
            containerClassName="mb-4"
            className="text-[#7a5a35] dark:text-slate-100"
          />

          <Input
            label="Confirmar Senha"
            placeholder="Repita sua senha"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (confirmPasswordError) setConfirmPasswordError('');
            }}
            icon={Lock}
            secureTextEntry
            error={confirmPasswordError}
            containerClassName="mb-6"
            className="text-[#7a5a35] dark:text-slate-100"
          />

          <Button
            title="Criar conta"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            className="h-14"
          />
        </View>

        <View className="mt-8 flex-row justify-center items-center pb-10">
          <AppText className="text-[#7a4c1e] dark:text-slate-200 text-lg">Já tem uma conta? </AppText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AppText className="text-[#8a4c00] dark:text-primary font-bold text-lg">Faça login</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Layout>
  );
};

export default Register;
