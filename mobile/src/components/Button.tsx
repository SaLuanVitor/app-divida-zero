import React from 'react';
import {
    TouchableOpacity,
    TouchableOpacityProps,
    ActivityIndicator,
    View
} from 'react-native';
import AppText from './AppText';
import { useAccessibility } from '../context/AccessibilityContext';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    textClassName?: string;
}

const cn = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(' ');

const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className,
    textClassName,
    style,
    disabled,
    ...rest
}) => {
    const { largerTouchTargets, fontScale } = useAccessibility();
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
        primary: 'bg-primary shadow-md shadow-orange-200',
        secondary: 'bg-slate-800',
        outline: 'bg-transparent border border-slate-200 dark:border-slate-700',
        ghost: 'bg-transparent',
        danger: 'bg-red-500 shadow-md shadow-red-200',
    };

    const textVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
        primary: 'text-white',
        secondary: 'text-white',
        outline: 'text-slate-900 dark:text-slate-100',
        ghost: 'text-primary',
        danger: 'text-white',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
        sm: 'px-4 rounded-lg',
        md: 'px-6 rounded-xl',
        lg: 'px-8 rounded-2xl',
    };

    const isDark = variant === 'secondary' || variant === 'primary' || variant === 'danger';
    const baseHeightBySize: Record<NonNullable<ButtonProps['size']>, number> = {
        sm: 40,
        md: 48,
        lg: 56,
    };
    const scaledHeight = Math.round(baseHeightBySize[size] * Math.max(fontScale, 1));
    const computedHeight = Math.max(scaledHeight, largerTouchTargets ? 56 : 0);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading || disabled}
            accessibilityRole="button"
            accessibilityLabel={title}
            className={cn(
                'flex-row items-center justify-center',
                variants[variant],
                sizes[size],
                (loading || disabled) && 'opacity-60',
                className
            )}
            style={[{ minHeight: computedHeight, height: computedHeight }, style]}
            {...rest}
        >
            {loading ? (
                <ActivityIndicator color={isDark ? '#fff' : '#f48c25'} />
            ) : (
                <View className="flex-row items-center justify-center">
                    {icon && <View className="mr-2">{icon}</View>}
                    <AppText
                        className={cn('text-base font-bold tracking-tight', textVariants[variant], textClassName)}
                    >
                        {title}
                    </AppText>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default Button;

