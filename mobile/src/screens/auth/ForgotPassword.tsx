import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
    const navigation = useNavigation<any>();
    const { requestPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        setInfoMessage('');

        if (!email.trim()) {
            setEmailError('Informe seu e-mail.');
            return;
        }

        if (!emailRegex.test(email.trim())) {
            setEmailError('Informe um e-mail válido.');
            return;
        }

        setLoading(true);
        try {
            const devToken = await requestPasswordReset(email.trim());
            const message = devToken
                ? `Solicitação enviada. Token de desenvolvimento: ${devToken}`
                : 'Se o e-mail existir, enviaremos as instruções para redefinição.';

            setInfoMessage(message);
            Alert.alert('Solicitação enviada', 'Agora você pode usar o token para redefinir a senha.');
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Falha ao solicitar recuperação de senha.';
            Alert.alert('Não foi possível concluir', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout scrollable className="bg-[#f8f7f5]" contentContainerClassName="bg-[#f8f7f5] pb-10">
            <View className="flex-row items-center mb-6">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="p-2 -ml-2 self-start"
                >
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text className="text-slate-900 text-lg font-bold ml-2">Recuperar Senha</Text>
            </View>

            <View className="items-center pt-4 pb-5">
                <View className="mb-6 h-24 w-24 rounded-full bg-primary/10 items-center justify-center">
                    <KeyRound size={46} color="#f48c25" />
                </View>
                <Text className="text-3xl font-extrabold text-slate-900 text-center mb-3">
                    Esqueceu sua senha?
                </Text>
                <Text className="text-base text-slate-600 text-center px-2">
                    Informe seu e-mail e siga as instruções para redefinir seu acesso.
                </Text>
            </View>

            {infoMessage ? (
                <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Text className="text-amber-800 text-sm font-medium">{infoMessage}</Text>
                </View>
            ) : null}

            <Input
                label="E-mail"
                placeholder="seu@email.com"
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

            <Button
                title="Enviar Instruções"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                className="mt-4 h-14"
            />

            <View className="mt-6 items-center gap-3">
                <TouchableOpacity onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}>
                    <Text className="text-primary font-bold">Já tenho token de recuperação</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text className="text-slate-500 font-medium">
                        Lembrou sua senha? <Text className="text-primary font-bold">Voltar ao login</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="h-2 w-full bg-primary/20 mt-12" />
        </Layout>
    );
};

export default ForgotPassword;
