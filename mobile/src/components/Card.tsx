import React from 'react';
import { View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from './AppText';

type CardVariant = 'default' | 'income' | 'expense' | 'debt';

interface CardProps extends ViewProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    noPadding?: boolean;
    /** Variante com borda colorida à esquerda (registros por tipo). */
    variant?: CardVariant;
    /** Aplica gradiente sutil laranja (card de saldo). */
    gradient?: boolean;
}

const cn = (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' ');

const VARIANT_BORDER: Record<Exclude<CardVariant, 'default'>, string> = {
    income: 'border-l-4 border-l-green-500',
    expense: 'border-l-4 border-l-yellow-500',
    debt: 'border-l-4 border-l-red-500',
};

const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    noPadding = false,
    variant = 'default',
    gradient = false,
    className,
    ...rest
}) => {
    const variantClass = variant === 'default' ? '' : VARIANT_BORDER[variant];

    const body = (
        <>
            {(title || subtitle) && (
                <View className="p-4 border-b border-slate-50 dark:border-slate-800">
                    {title && (
                        <AppText
                            className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            style={{ flexShrink: 1 }}
                        >
                            {title}
                        </AppText>
                    )}
                    {subtitle && (
                        <AppText
                            className="text-slate-500 dark:text-slate-200 text-sm mt-1"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            style={{ flexShrink: 1 }}
                        >
                            {subtitle}
                        </AppText>
                    )}
                </View>
            )}
            <View className={cn(noPadding ? 'p-0' : 'p-4')}>
                {children}
            </View>
        </>
    );

    if (gradient) {
        return (
            <View
                className={cn(
                    'rounded-2xl shadow-sm border border-orange-100 dark:border-slate-800 overflow-hidden',
                    variantClass,
                    className
                )}
                {...rest}
            >
                <LinearGradient
                    colors={['#fff7ed', '#ffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                >
                    {body}
                </LinearGradient>
            </View>
        );
    }

    return (
        <View className={cn(
            'bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden',
            variantClass,
            className
        )} {...rest}>
            {body}
        </View>
    );
};

export default Card;
