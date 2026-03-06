import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../utils/cn';

interface LayoutProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string;
    contentContainerClassName?: string;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    scrollable = false,
    className,
    contentContainerClassName
}) => {
    const { width } = useWindowDimensions();
    const shouldConstrain = width >= 768;

    const contentWrapperStyle = {
        width: '100%' as const,
        alignSelf: 'center' as const,
        maxWidth: shouldConstrain ? 460 : 9999,
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} className={cn('flex-1 bg-white', className)}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
                className="flex-1"
            >
                {scrollable ? (
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName={cn('p-6 pb-8', contentContainerClassName)}
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={contentWrapperStyle}>{children}</View>
                    </ScrollView>
                ) : (
                    <View className={cn('flex-1 p-6 pb-8', contentContainerClassName)}>
                        <View style={contentWrapperStyle} className="flex-1">
                            {children}
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Layout;
