import React, { useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Mail, Lock, User, ArrowLeft, Trophy } from 'lucide-react-native';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordHint = useMemo(() => {
    if (!password) return 'Mínimo de 8 caracteres.';
    if (password.length < 8) return 'Senha ainda curta.';
    return 'Senha com tamanho mínimo válido.';
  }, [password]);

  const validate = () => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Informe o nome do usuário.');
      valid = false;
    } else {
      setNameError('');
    }

    if (!email.trim()) {
      setEmailError('Informe seu usuário.');
      valid = false;
    } else {
      setEmailError('');
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

    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: {
              prefillEmail: email.trim(),
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

      if (nameFieldError) setNameError(nameFieldError);
      if (emailFieldError) setEmailError(emailFieldError);
      if (passwordFieldError) setPasswordError(passwordFieldError);

      if (backendCode === 'email_taken') {
        Alert.alert('Usuário já cadastrado', backendMessage || 'Use outro identificador, faça login ou recupere sua senha.');
        return;
      }

      const message = backendMessage ?? 'Falha ao criar conta. Tente novamente em instantes.';
      Alert.alert('Não foi possível criar sua conta', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable formMode className="bg-[#f8f7f5] dark:bg-black" contentContainerClassName="bg-[#f8f7f5] dark:bg-black pb-10">
      <View className="flex-row items-center mb-5">
                <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 self-start"
        >
          <ArrowLeft size={24} color={darkMode ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold ml-2">Cadastro</AppText>
      </View>

      <AppText className="text-slate-900 dark:text-slate-100 text-[30px] font-extrabold leading-tight mb-7">
        Crie sua conta e <AppText className="text-primary">comece sua jornada</AppText>
      </AppText>

      <View className="bg-white dark:bg-[#121212] border border-[#e6e0db] dark:border-slate-700 rounded-2xl p-5 mb-8">
        <View className="flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-[#f8f7f5] dark:bg-black items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
            <Trophy size={30} color={darkMode ? '#cbd5e1' : '#94a3b8'} />
          </View>
          <View className="flex-1">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base mb-1">Sua primeira conquista</AppText>
            <AppText className="text-slate-600 dark:text-slate-100 text-sm">
              Complete o cadastro para desbloquear a medalha de <AppText className="text-primary font-bold">Novato</AppText>.
            </AppText>
          </View>
        </View>
      </View>

      <Input
        label="Nome do usuário"
        placeholder="Nome do usuário"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError('');
        }}
        icon={User}
        error={nameError}
      />

      <Input
        label="Usuário"
        placeholder="usuario"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) setEmailError('');
        }}
        icon={Mail}
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        error={emailError}
      />

      <Input
        label="Senha"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (passwordError) setPasswordError('');
        }}
        icon={Lock}
        secureTextEntry
        error={passwordError}
      />

      <AppText className={`text-xs mb-4 ml-1 ${password.length >= 8 ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-200'}`}>
        {passwordHint}
      </AppText>

      <Button
        title="Criar Conta"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        className="h-14 mt-1"
      />

      <View className="mt-8 items-center">
        <AppText className="text-slate-500 dark:text-slate-200 text-sm">
          Já tem uma conta?{' '}
          <AppText className="text-primary font-bold" onPress={() => navigation.goBack()}>
            Faça login
          </AppText>
        </AppText>
      </View>
    </Layout>
  );
};

export default Register;



