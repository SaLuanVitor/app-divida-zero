import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ScrollViewProps,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

interface LayoutProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string;
    contentContainerClassName?: string;
    scrollViewProps?: ScrollViewProps;
}

const cn = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(' ');

const Layout: React.FC<LayoutProps> = ({
    children,
    scrollable = false,
    className,
    contentContainerClassName,
    scrollViewProps,
}) => {
    const { width } = useWindowDimensions();
    const bottomTabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
    const shouldConstrain = width >= 768;
    const { contentContainerStyle: userContentContainerStyle, ...restScrollViewProps } = scrollViewProps ?? {};
    const bottomScrollPadding = bottomTabBarHeight > 0 ? bottomTabBarHeight + 32 : undefined;

    const contentWrapperStyle = {
        width: '100%' as const,
        alignSelf: 'center' as const,
        maxWidth: shouldConstrain ? 460 : 9999,
    };

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            className={cn('flex-1 bg-white dark:bg-black', className)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
                className="flex-1"
            >
                {scrollable ? (
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName={cn('p-6 pb-8', contentContainerClassName)}
                        contentContainerStyle={[
                            { flexGrow: 1 },
                            bottomScrollPadding !== undefined ? { paddingBottom: bottomScrollPadding } : null,
                            userContentContainerStyle,
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        {...restScrollViewProps}
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

