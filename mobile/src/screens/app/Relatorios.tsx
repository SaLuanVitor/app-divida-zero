import React from 'react';
import { View, Text } from 'react-native';
import { ChartColumnIncreasing, ArrowUpCircle, ArrowDownCircle, WalletCards } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';

const Relatorios = () => {
    return (
        <Layout scrollable contentContainerClassName="p-4 bg-[#f8f7f5] pb-28">
            <Text className="text-slate-900 text-2xl font-bold mb-1">Relatórios</Text>
            <Text className="text-slate-500 mb-5">Resumo das entradas e saídas do período.</Text>

            <View className="flex-row gap-3 mb-3">
                <Card className="flex-1" noPadding>
                    <View className="p-4">
                        <ArrowUpCircle size={18} color="#10b981" />
                        <Text className="text-slate-500 text-xs mt-2">Entradas</Text>
                        <Text className="text-slate-900 font-bold text-lg">R$ 4.500,00</Text>
                    </View>
                </Card>
                <Card className="flex-1" noPadding>
                    <View className="p-4">
                        <ArrowDownCircle size={18} color="#ef4444" />
                        <Text className="text-slate-500 text-xs mt-2">Saídas</Text>
                        <Text className="text-slate-900 font-bold text-lg">R$ 2.150,00</Text>
                    </View>
                </Card>
            </View>

            <Card className="mb-3" noPadding>
                <View className="p-4">
                    <View className="flex-row items-center gap-2 mb-3">
                        <ChartColumnIncreasing size={18} color="#f48c25" />
                        <Text className="text-slate-900 font-bold">Saldo do mês</Text>
                    </View>
                    <Text className="text-2xl text-slate-900 font-extrabold">R$ 2.350,00</Text>
                    <Text className="text-xs text-slate-500 mt-1">Atualizado em tempo real</Text>
                </View>
            </Card>

            <Card noPadding>
                <View className="p-4">
                    <View className="flex-row items-center gap-2 mb-2">
                        <WalletCards size={18} color="#334155" />
                        <Text className="text-slate-900 font-bold">Principais categorias</Text>
                    </View>
                    <Text className="text-slate-500 text-sm">Moradia, alimentação e cartão concentram 74% dos gastos.</Text>
                </View>
            </Card>
        </Layout>
    );
};

export default Relatorios;
