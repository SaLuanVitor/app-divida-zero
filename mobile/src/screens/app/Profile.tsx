import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import {
    User as UserIcon,
    Settings,
    Shield,
    Bell,
    HelpCircle,
    LogOut,
    ChevronRight,
    Camera,
    Trophy,
} from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
    const { user, signOut } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const menuItems = [
        { label: 'Dados pessoais', icon: UserIcon, color: '#3b82f6' },
        { label: 'Configuracoes', icon: Settings, color: '#64748b' },
        { label: 'Notificacoes', icon: Bell, color: '#f59e0b' },
        { label: 'Seguranca', icon: Shield, color: '#10b981' },
        { label: 'Ajuda e suporte', icon: HelpCircle, color: '#8b5cf6' },
    ];

    return (
        <>
            <Layout contentContainerClassName="p-0 bg-[#f8f7f5]">
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="bg-white px-6 pt-8 pb-8 items-center border-b border-slate-100">
                        <View className="relative">
                            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20">
                                <UserIcon size={48} color="#f48c25" />
                            </View>
                            <TouchableOpacity
                                className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white"
                                activeOpacity={0.8}
                            >
                                <Camera size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-900 text-2xl font-bold mt-4">{user?.name}</Text>
                        <Text className="text-slate-500 text-sm">{user?.email}</Text>

                        <View className="mt-4 bg-[#f8f7f5] px-4 py-2 rounded-full">
                            <Text className="text-slate-700 text-xs font-bold">Editar perfil</Text>
                        </View>
                    </View>

                    <View className="px-6 -mt-6">
                        <Card className="p-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 p-2 rounded-lg">
                                        <Trophy size={18} color="#f48c25" />
                                    </View>
                                    <View className="ml-3">
                                        <Text className="text-slate-900 font-bold">Nivel 5</Text>
                                        <Text className="text-slate-500 text-xs">350/500 XP para o nivel 6</Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color="#94a3b8" />
                            </View>
                            <View className="h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                                <View className="h-full w-[70%] bg-primary rounded-full" />
                            </View>
                        </Card>
                    </View>

                    <View className="px-6 py-6">
                        <Text className="text-slate-900 font-bold text-lg mb-4">Conta</Text>
                        <Card className="mb-6 overflow-hidden" noPadding>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={item.label}
                                    className={`flex-row items-center justify-between p-4 bg-white ${i !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <item.icon size={20} color={item.color} />
                                        <Text className="text-slate-700 font-medium ml-3">{item.label}</Text>
                                    </View>
                                    <ChevronRight size={18} color="#cbd5e1" />
                                </TouchableOpacity>
                            ))}
                        </Card>

                        <Button
                            title="Sair da conta"
                            variant="ghost"
                            onPress={() => setShowLogoutConfirm(true)}
                            icon={<LogOut size={20} color="#ef4444" />}
                            className="mt-1"
                            textClassName="text-red-500"
                        />
                    </View>

                    <View className="items-center pb-10">
                        <Text className="text-slate-400 text-xs text-center">Divida Zero App - v1.0.0</Text>
                    </View>
                </ScrollView>
            </Layout>

            {showLogoutConfirm ? (
                <View className="absolute inset-0 z-50">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !logoutLoading && setShowLogoutConfirm(false)} />
                    <View className="absolute left-4 right-4 top-[38%] bg-white rounded-2xl border border-slate-200 p-4">
                        <Text className="text-slate-900 text-base font-bold">Sair da conta</Text>
                        <Text className="text-slate-600 text-sm mt-2 mb-4">
                            Deseja realmente sair do aplicativo?
                        </Text>

                        <Button
                            title="Sair da conta"
                            variant="danger"
                            loading={logoutLoading}
                            disabled={logoutLoading}
                            onPress={async () => {
                                setLogoutLoading(true);
                                try {
                                    await signOut();
                                } finally {
                                    setLogoutLoading(false);
                                    setShowLogoutConfirm(false);
                                }
                            }}
                            className="h-12 mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={logoutLoading}
                            onPress={() => setShowLogoutConfirm(false)}
                            className="h-11"
                        />
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Profile;
