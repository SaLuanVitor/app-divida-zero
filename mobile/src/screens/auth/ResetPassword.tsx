import React, { useEffect, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeft, Mail, KeyRound, Lock } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPassword = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { resetPassword } = useAuth();
    const { darkMode } = useThemeMode();

    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [tokenError, setTokenError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (route.params?.email) {
            setEmail(route.params.email);
        }
    }, [route.params?.email]);

    const validate = () => {
        let valid = true;

        if (!email.trim()) {
            setEmailError('Informe seu usuário.');
            valid = false;
        } else if (!emailRegex.test(email.trim())) {
            setEmailError('Informe um usuário válido.');
            valid = false;
        } else {
            setEmailError('');
        }

        if (!token.trim()) {
            setTokenError('Informe o token recebido.');
            valid = false;
        } else {
            setTokenError('');
        }

        if (!newPassword) {
            setPasswordError('Informe sua nova senha.');
            valid = false;
        } else if (newPassword.length < 8) {
            setPasswordError('A senha deve ter no mínimo 8 caracteres.');
            valid = false;
        } else {
            setPasswordError('');
        }

        return valid;
    };

    const handleReset = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await resetPassword(email.trim(), token.trim(), newPassword);
            Alert.alert('Senha atualizada', 'Sua senha foi redefinida com sucesso. Você será redirecionado para o login.', [
                {
                    text: 'Continuar',
                    onPress: () => navigation.replace('Login', {
                        prefillEmail: email.trim(),
                        infoMessage: 'Senha redefinida. Entre com sua nova senha.',
                    })
                }
            ]);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Falha ao redefinir a senha.';
            Alert.alert('Não foi possível redefinir', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout scrollable formMode className="bg-[#f8f7f5] dark:bg-black" contentContainerClassName="bg-[#f8f7f5] dark:bg-black pb-10">
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 self-start">
                    <ArrowLeft size={24} color={darkMode ? '#e2e8f0' : '#0f172a'} />
                </TouchableOpacity>
                <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold ml-2">Redefinir Senha</AppText>
            </View>

            <View className="items-center pt-3 pb-4">
                <View className="mb-5 h-20 w-20 rounded-full bg-primary/10 items-center justify-center">
                    <KeyRound size={38} color="#f48c25" />
                </View>
                <AppText className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 text-center mb-2">Informe o token de recuperação</AppText>
                <AppText className="text-sm text-slate-600 dark:text-slate-200 text-center">Use o token recebido para concluir a redefinição da senha.</AppText>
            </View>

            <Input
                label="Usuário"
                placeholder="usuario"
                value={email}
                onChangeText={(value) => {
                    setEmail(value);
                    if (emailError) setEmailError('');
                }}
                icon={Mail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError}
            />

            <Input
                label="Token"
                placeholder="Cole o token aqui"
                value={token}
                onChangeText={(value) => {
                    setToken(value);
                    if (tokenError) setTokenError('');
                }}
                icon={KeyRound}
                autoCapitalize="none"
                error={tokenError}
            />

            <Input
                label="Nova senha"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChangeText={(value) => {
                    setNewPassword(value);
                    if (passwordError) setPasswordError('');
                }}
                icon={Lock}
                secureTextEntry
                error={passwordError}
            />

            <Button
                title="Redefinir senha"
                onPress={handleReset}
                loading={loading}
                disabled={loading}
                className="mt-4"
            />
        </Layout>
    );
};

export default ResetPassword;







