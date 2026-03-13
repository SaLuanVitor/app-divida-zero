import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Animated, StyleSheet } from 'react-native';
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
        <View style={styles.container}>
            <Animated.View
                style={[styles.content, { opacity: fadeAnim }]}
            >
                <View style={styles.logoContainer}>
                    <ShieldCheck size={64} color="#f48c25" />
                </View>
                <Text style={styles.title}>
                    Dívida<Text style={styles.titleHighlight}>Zero</Text>
                </Text>
                <Text style={styles.subtitle}>
                    Assuma o Controle
                </Text>

                <View style={styles.loader}>
                    <ActivityIndicator color="#f48c25" size="small" />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        backgroundColor: 'rgba(244, 140, 37, 0.1)',
        padding: 24,
        borderRadius: 9999,
        marginBottom: 24,
    },
    title: {
        color: '#0f172a',
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: -1,
    },
    titleHighlight: {
        color: '#f48c25',
    },
    subtitle: {
        color: '#94a3b8',
        marginTop: 8,
        fontWeight: '500',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontSize: 12,
    },
    loader: {
        marginTop: 80,
    },
});

export default Splash;
