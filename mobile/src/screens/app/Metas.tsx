import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Target, PlusCircle, TrendingUp, CircleDollarSign, CalendarDays } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';

const Metas = () => {
    return (
        <Layout scrollable contentContainerClassName="p-4 bg-[#f8f7f5] pb-28">
            <Text className="text-slate-900 text-2xl font-bold mb-1">Metas</Text>
            <Text className="text-slate-500 mb-5">Acompanhe sua evolução e ajuste suas metas.</Text>

            <Card className="mb-4" noPadding>
                <View className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <Target size={18} color="#f48c25" />
                            <Text className="text-slate-900 font-bold">Quitar cartão Nubank</Text>
                        </View>
                        <Text className="text-primary text-xs font-bold">+1000 XP</Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-slate-500 text-xs">Concluído</Text>
                        <Text className="text-slate-700 text-xs font-bold">70%</Text>
                    </View>

                    <View className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <View className="h-full w-[70%] bg-primary rounded-full" />
                    </View>

                    <View className="flex-row justify-between mt-3">
                        <View>
                            <Text className="text-slate-400 text-xs">Atual</Text>
                            <Text className="text-slate-900 font-bold">R$ 850,00</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-slate-400 text-xs">Meta</Text>
                            <Text className="text-slate-900 font-bold">R$ 1.200,00</Text>
                        </View>
                    </View>
                </View>
            </Card>

            <Card className="mb-4" noPadding>
                <View className="p-4">
                    <View className="flex-row items-center gap-2 mb-2">
                        <TrendingUp size={18} color="#14b8a6" />
                        <Text className="text-slate-900 font-bold">Simulador rápido</Text>
                    </View>
                    <Text className="text-slate-500 text-sm mb-4">Se você adicionar R$ 100 por mês, alcança a meta 2 meses antes.</Text>
                    <TouchableOpacity className="bg-primary rounded-xl h-11 items-center justify-center">
                        <Text className="text-white font-bold">Aplicar sugestão</Text>
                    </TouchableOpacity>
                </View>
            </Card>

            <Card noPadding>
                <View className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <PlusCircle size={18} color="#f48c25" />
                        <Text className="text-slate-900 font-bold">Criar nova meta</Text>
                    </View>
                    <CalendarDays size={18} color="#94a3b8" />
                </View>
            </Card>
        </Layout>
    );
};

export default Metas;
