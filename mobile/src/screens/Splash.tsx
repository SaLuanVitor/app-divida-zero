import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

const Splash = () => {
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View className="flex-1 bg-white items-center justify-center">
            <Animated.View
                style={{ opacity: fadeAnim }}
                className="items-center"
            >
                <View className="bg-primary/10 p-6 rounded-full mb-6">
                    <ShieldCheck size={64} color="#f48c25" />
                </View>
                <Text className="text-slate-900 text-4xl font-bold tracking-tighter">
                    Dívida<Text className="text-primary">Zero</Text>
                </Text>
                <Text className="text-slate-400 mt-2 font-medium tracking-widest uppercase text-xs">
                    Assuma o Controle
                </Text>

                <View className="mt-20">
                    <ActivityIndicator color="#f48c25" size="small" />
                </View>
            </Animated.View>
        </View>
    );
};

export default Splash;
