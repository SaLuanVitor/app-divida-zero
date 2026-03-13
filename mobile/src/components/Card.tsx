import React from 'react';
import { View, ViewProps, Text, StyleSheet } from 'react-native';

interface CardProps extends ViewProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    noPadding = false,
    className,
    ...rest
}) => {
    return (
        <View style={styles.card} {...rest}>
            {(title || subtitle) && (
                <View style={styles.header}>
                    {title && (
                        <Text style={styles.title}>
                            {title}
                        </Text>
                    )}
                    {subtitle && (
                        <Text style={styles.subtitle}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            )}
            <View style={noPadding ? styles.contentNoPadding : styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        overflow: 'hidden',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    title: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 22,
    },
    subtitle: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    contentNoPadding: {
        padding: 0,
    },
});

export default Card;
