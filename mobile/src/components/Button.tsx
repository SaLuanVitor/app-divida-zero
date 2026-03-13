import React from 'react';
import {
    TouchableOpacity,
    TouchableOpacityProps,
    Text,
    ActivityIndicator,
    View,
    StyleSheet
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    textClassName?: string;
}

const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className,
    textClassName,
    disabled,
    ...rest
}) => {
    const getButtonStyle = () => {
        const baseStyles = [styles.base];

        // Add variant styles
        switch (variant) {
            case 'primary':
                baseStyles.push(styles.primary);
                break;
            case 'secondary':
                baseStyles.push(styles.secondary);
                break;
            case 'outline':
                baseStyles.push(styles.outline);
                break;
            case 'ghost':
                baseStyles.push(styles.ghost);
                break;
            case 'danger':
                baseStyles.push(styles.danger);
                break;
        }

        // Add size styles
        switch (size) {
            case 'sm':
                baseStyles.push(styles.sm);
                break;
            case 'md':
                baseStyles.push(styles.md);
                break;
            case 'lg':
                baseStyles.push(styles.lg);
                break;
        }

        // Add disabled/loading styles
        if (loading || disabled) {
            baseStyles.push(styles.disabled);
        }

        return baseStyles;
    };

    const getTextStyle = () => {
        const baseStyles = [styles.textBase];

        switch (variant) {
            case 'primary':
            case 'secondary':
            case 'danger':
                baseStyles.push(styles.textLight);
                break;
            case 'outline':
                baseStyles.push(styles.textDark);
                break;
            case 'ghost':
                baseStyles.push(styles.textPrimary);
                break;
        }

        return baseStyles;
    };

    const isDark = variant === 'secondary' || variant === 'primary' || variant === 'danger';

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading || disabled}
            style={getButtonStyle()}
            {...rest}
        >
            {loading ? (
                <ActivityIndicator color={isDark ? '#fff' : '#f48c25'} />
            ) : (
                <View style={styles.content}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={getTextStyle()}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: '#f48c25',
        shadowColor: '#fb923c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    secondary: {
        backgroundColor: '#1e293b',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: '#ef4444',
        shadowColor: '#fca5a5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sm: {
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    md: {
        height: 48,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    lg: {
        height: 56,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    disabled: {
        opacity: 0.6,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: 8,
    },
    textBase: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.025,
    },
    textLight: {
        color: '#ffffff',
    },
    textDark: {
        color: '#0f172a',
    },
    textPrimary: {
        color: '#f48c25',
    },
});

export default Button;
