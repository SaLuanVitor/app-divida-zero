import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity
} from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';

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

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const isPassword = secureTextEntry;
    const actualSecureTextEntry = isPassword && !isPasswordVisible;

    return (
        <View className={cn('w-full mb-4', containerClassName)}>
            {label && (
                <Text className="text-slate-900 dark:text-slate-100 font-medium text-base mb-2">
                    {label}
                </Text>
            )}

            <View
                className={cn(
                    'flex-row items-center w-full h-14 px-4 rounded-xl border bg-white dark:bg-[#1a1a1a]',
                    isFocused ? 'border-primary' : 'border-slate-200',
                    error ? 'border-red-500' : ''
                )}
            >
                {Icon && (
                    <Icon
                        size={20}
                        color={isFocused ? '#f48c25' : '#94a3b8'}
                        className="mr-3"
                    />
                )}

                <TextInput
                    className={cn('flex-1 h-full text-slate-900 dark:text-slate-100 text-base font-normal', className)}
                    placeholderTextColor="#94a3b8"
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
                            <EyeOff size={20} color="#94a3b8" />
                        ) : (
                            <Eye size={20} color="#94a3b8" />
                        )}
                    </TouchableOpacity>
                ) : RightIcon ? (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        activeOpacity={0.7}
                        className="p-2"
                        disabled={!onRightIconPress}
                    >
                        <RightIcon size={20} color="#94a3b8" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {error && (
                <Text className="text-red-500 text-sm mt-1 ml-1">
                    {error}
                </Text>
            )}
        </View>
    );
};

export default Input;

