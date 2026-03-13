import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    StyleSheet
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
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                ]}
            >
                {Icon && (
                    <Icon
                        size={20}
                        color={isFocused ? '#f48c25' : '#94a3b8'}
                        style={styles.icon}
                    />
                )}

                <TextInput
                    style={styles.textInput}
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
                        style={styles.rightIcon}
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
                        style={styles.rightIcon}
                        disabled={!onRightIconPress}
                    >
                        <RightIcon size={20} color="#94a3b8" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {error && (
                <Text style={styles.errorText}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    inputContainerFocused: {
        borderColor: '#f48c25',
    },
    inputContainerError: {
        borderColor: '#ef4444',
    },
    icon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        height: '100%',
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '400',
    },
    rightIcon: {
        padding: 8,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginTop: 4,
    },
});

export default Input;
