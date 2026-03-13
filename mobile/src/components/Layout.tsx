import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    useWindowDimensions,
    StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        width: '100%',
        alignSelf: 'center',
        maxWidth: shouldConstrain ? 460 : 9999,
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
                style={styles.keyboardAvoiding}
            >
                {scrollable ? (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={contentWrapperStyle}>{children}</View>
                    </ScrollView>
                ) : (
                    <View style={styles.nonScrollableContainer}>
                        <View style={[contentWrapperStyle, styles.nonScrollableContent]}>
                            {children}
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    keyboardAvoiding: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    nonScrollableContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    nonScrollableContent: {
        flex: 1,
    },
});

export default Layout;
