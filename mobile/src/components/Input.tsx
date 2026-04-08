import React, { useState } from 'react';
import {
    View,
    TextInputProps,
    TouchableOpacity
} from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import { useAccessibility } from '../context/AccessibilityContext';
import { useThemeMode } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: LucideIcon;
    rightIcon?: LucideIcon;
    onRightIconPress?: () => void;
    containerClassName?: string;
}

const cn = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(' ');

const Input: React.FC<InputProps> = ({
    label,
    error,
    icon: Icon,
    rightIcon: RightIcon,
    onRightIconPress,
    secureTextEntry,
    className,
    containerClassName,
    ...rest
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const { largerTouchTargets, fontScale } = useAccessibility();
    const { darkMode } = useThemeMode();

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const isPassword = secureTextEntry;
    const actualSecureTextEntry = isPassword && !isPasswordVisible;
    const inputHeight = Math.max(Math.round(56 * Math.max(fontScale, 1)), largerTouchTargets ? 60 : 0);
    const iconSize = Math.max(20, Math.round(20 * Math.min(fontScale, 1.2)));

    return (
        <View className={cn('w-full mb-4', containerClassName)}>
            {label && (
                <AppText className="text-slate-900 dark:text-slate-100 font-medium text-base mb-2">
                    {label}
                </AppText>
            )}

            <View
                className={cn(
                    'flex-row items-center w-full px-4 rounded-xl border bg-white dark:bg-[#1a1a1a]',
                    isFocused ? 'border-primary' : 'border-slate-200',
                    error ? 'border-red-500' : ''
                )}
                style={{ minHeight: inputHeight, height: inputHeight }}
            >
                {Icon && (
                    <Icon
                        size={iconSize}
                        color={isFocused ? '#f48c25' : darkMode ? '#cbd5e1' : '#94a3b8'}
                        className="mr-3"
                    />
                )}

                <AppTextInput
                    className={cn('flex-1 h-full text-slate-900 dark:text-slate-100 text-base font-normal', className)}
                    placeholderTextColor={darkMode ? '#cbd5e1' : '#94a3b8'}
                    accessibilityLabel={label || rest.placeholder || 'Campo de texto'}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={actualSecureTextEntry}
                    {...rest}
                />

                {isPassword ? (
                    <TouchableOpacity
                        onPress={togglePasswordVisibility}
                        activeOpacity={0.7}
                        className="p-2"
                    >
                        {isPasswordVisible ? (
                            <EyeOff size={iconSize} color={darkMode ? '#cbd5e1' : '#94a3b8'} />
                        ) : (
                            <Eye size={iconSize} color={darkMode ? '#cbd5e1' : '#94a3b8'} />
                        )}
                    </TouchableOpacity>
                ) : RightIcon ? (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        activeOpacity={0.7}
                        className="p-2"
                        disabled={!onRightIconPress}
                    >
                        <RightIcon size={iconSize} color={darkMode ? '#cbd5e1' : '#94a3b8'} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {error && (
                <AppText className="text-red-500 text-sm mt-1 ml-1">
                    {error}
                </AppText>
            )}
        </View>
    );
};

export default Input;

