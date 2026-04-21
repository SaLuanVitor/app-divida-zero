import React from 'react';
import {
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    ScrollView,
    ScrollViewProps,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormKeyboardProvider } from '../context/FormKeyboardContext';
import { useBottomInset } from '../context/BottomInsetContext';

interface LayoutProps {
    children: React.ReactNode;
    scrollable?: boolean;
    formMode?: boolean;
    className?: string;
    contentContainerClassName?: string;
    scrollViewProps?: ScrollViewProps;
    scrollRef?: React.RefObject<ScrollView | null>;
}

const cn = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(' ');

const Layout: React.FC<LayoutProps> = ({
    children,
    scrollable = false,
    formMode = false,
    className,
    contentContainerClassName,
    scrollViewProps,
    scrollRef,
}) => {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { contentBottomInset } = useBottomInset();
    const internalScrollViewRef = React.useRef<ScrollView>(null);
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);
    const shouldConstrain = width >= 768;
    const { contentContainerStyle: userContentContainerStyle, ...restScrollViewProps } = scrollViewProps ?? {};
    const baseBottomPadding = Math.max(32, contentBottomInset);
    const keyboardPadding = formMode ? Math.max(0, keyboardHeight - insets.bottom) : 0;
    const bottomScrollPadding = baseBottomPadding + keyboardPadding;

    React.useEffect(() => {
        if (!formMode) return undefined;

        const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardHeight(event.endCoordinates?.height ?? 0);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [formMode]);

    const handleInputFocus = React.useCallback((target?: number | null) => {
        const activeScrollRef = scrollRef?.current ?? internalScrollViewRef.current;
        if (!formMode || !scrollable || !target || !activeScrollRef) return;

        // Keep some top context (label + field) visible above keyboard on Android.
        const extraOffset = 96;
        requestAnimationFrame(() => {
            (activeScrollRef as any)?.scrollResponderScrollNativeHandleToKeyboard?.(target, extraOffset, true);
        });
    }, [formMode, scrollRef, scrollable]);

    const contentWrapperStyle = {
        width: '100%' as const,
        alignSelf: 'center' as const,
        maxWidth: shouldConstrain ? 460 : 9999,
    };

    return (
        <FormKeyboardProvider value={{ onInputFocus: handleInputFocus }}>
            <SafeAreaView
                edges={['top', 'left', 'right']}
                className={cn('flex-1 bg-white dark:bg-black', className)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : formMode ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : formMode ? 8 : 16}
                    className="flex-1"
                >
                    {scrollable ? (
                        <ScrollView
                            ref={scrollRef ?? internalScrollViewRef}
                            className="flex-1"
                            contentContainerClassName={cn('p-6 pb-8', contentContainerClassName)}
                            contentContainerStyle={[
                                { flexGrow: 1 },
                                bottomScrollPadding !== undefined ? { paddingBottom: bottomScrollPadding } : null,
                                userContentContainerStyle,
                            ]}
                            keyboardShouldPersistTaps={formMode ? 'handled' : 'always'}
                            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
        </FormKeyboardProvider>
    );
};

export default Layout;

