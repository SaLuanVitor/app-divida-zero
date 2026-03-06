import React, { createContext, useContext, useMemo, useState } from 'react';

type OverlayType = 'actions' | 'dayDetails' | null;

interface OverlayContextData {
    activeOverlay: OverlayType;
    openOverlay: (overlay: Exclude<OverlayType, null>) => void;
    closeOverlay: () => void;
    isOverlayOpen: (overlay: Exclude<OverlayType, null>) => boolean;
}

const OverlayContext = createContext<OverlayContextData>({} as OverlayContextData);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

    const value = useMemo(
        () => ({
            activeOverlay,
            openOverlay: (overlay: Exclude<OverlayType, null>) => setActiveOverlay(overlay),
            closeOverlay: () => setActiveOverlay(null),
            isOverlayOpen: (overlay: Exclude<OverlayType, null>) => activeOverlay === overlay,
        }),
        [activeOverlay]
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
