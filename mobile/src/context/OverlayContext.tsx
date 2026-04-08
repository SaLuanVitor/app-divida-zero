import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type OverlayType = 'actions' | 'dayDetails' | null;

interface OverlayContextData {
    activeOverlay: OverlayType;
    openOverlay: (overlay: Exclude<OverlayType, null>) => void;
    closeOverlay: () => void;
    isOverlayOpen: (overlay: Exclude<OverlayType, null>) => boolean;
    setOverlayBlocked: (blocked: boolean) => void;
    overlayBlocked: boolean;
}

const OverlayContext = createContext<OverlayContextData>({} as OverlayContextData);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
    const [overlayBlocked, setOverlayBlocked] = useState(false);
    const openOverlay = useCallback((overlay: Exclude<OverlayType, null>) => {
        if (overlayBlocked) return;
        setActiveOverlay(overlay);
    }, [overlayBlocked]);
    const closeOverlay = useCallback(() => {
        setActiveOverlay(null);
    }, []);
    const isOverlayOpen = useCallback(
        (overlay: Exclude<OverlayType, null>) => activeOverlay === overlay,
        [activeOverlay]
    );

    const value = useMemo(
        () => ({
            activeOverlay,
            openOverlay,
            closeOverlay,
            isOverlayOpen,
            setOverlayBlocked,
            overlayBlocked,
        }),
        [activeOverlay, closeOverlay, isOverlayOpen, openOverlay, overlayBlocked]
    );

    return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
};

export const useOverlay = () => {
    const context = useContext(OverlayContext);

    if (!context) {
        throw new Error('useOverlay deve ser utilizado dentro de OverlayProvider');
    }

    return context;
};

