import React, { createContext, useContext, useMemo } from 'react';

type BottomInsetContextValue = {
    tabBarHeight: number;
    contentBottomInset: number;
    overlayBottomInset: number;
};

const FALLBACK_TAB_BAR_HEIGHT = 84;
const CENTER_BUTTON_OVERHANG = 28;
const CONTENT_EXTRA_SPACING = 16;
const OVERLAY_EXTRA_SPACING = 12;

const BottomInsetContext = createContext<BottomInsetContextValue>({
    tabBarHeight: FALLBACK_TAB_BAR_HEIGHT,
    contentBottomInset: FALLBACK_TAB_BAR_HEIGHT + CENTER_BUTTON_OVERHANG + CONTENT_EXTRA_SPACING,
    overlayBottomInset: FALLBACK_TAB_BAR_HEIGHT + CENTER_BUTTON_OVERHANG + OVERLAY_EXTRA_SPACING,
});

export const BottomInsetProvider: React.FC<{
    children: React.ReactNode;
    tabBarHeight: number;
}> = ({ children, tabBarHeight }) => {
    const normalizedTabBarHeight = tabBarHeight > 0 ? tabBarHeight : FALLBACK_TAB_BAR_HEIGHT;

    const value = useMemo(
        () => ({
            tabBarHeight: normalizedTabBarHeight,
            contentBottomInset: normalizedTabBarHeight + CENTER_BUTTON_OVERHANG + CONTENT_EXTRA_SPACING,
            overlayBottomInset: normalizedTabBarHeight + CENTER_BUTTON_OVERHANG + OVERLAY_EXTRA_SPACING,
        }),
        [normalizedTabBarHeight]
    );

    return <BottomInsetContext.Provider value={value}>{children}</BottomInsetContext.Provider>;
};

export const useBottomInset = () => useContext(BottomInsetContext);
