import React from 'react';
import { View, ViewProps, Text } from 'react-native';

interface CardProps extends ViewProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    noPadding?: boolean;
}

const cn = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(' ');

const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    noPadding = false,
    className,
    ...rest
}) => {
    return (
        <View className={cn('bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden', className)} {...rest}>
            {(title || subtitle) && (
                <View className="p-4 border-b border-slate-50 dark:border-slate-800">
                    {title && (
                        <Text className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight">
                            {title}
                        </Text>
                    )}
                    {subtitle && (
                        <Text className="text-slate-500 dark:text-slate-300 text-sm mt-1">
                            {subtitle}
                        </Text>
                    )}
                </View>
            )}
            <View className={cn(noPadding ? 'p-0' : 'p-4')}>
                {children}
            </View>
        </View>
    );
};

export default Card;

