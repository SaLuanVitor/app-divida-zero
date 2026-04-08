import React, { useEffect, useRef } from 'react';
import { LayoutChangeEvent, View, ViewProps } from 'react-native';
import { useTutorial } from '../../context/TutorialContext';

type TutorialTargetProps = ViewProps & {
  targetId: string;
};

const TutorialTarget: React.FC<TutorialTargetProps> = ({ targetId, onLayout, collapsable, children, ...rest }) => {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget, refreshTargetMeasure } = useTutorial();

  useEffect(() => {
    registerTarget(targetId, ref.current);
    return () => unregisterTarget(targetId);
  }, [registerTarget, targetId, unregisterTarget]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout?.(event);
    registerTarget(targetId, ref.current);
    refreshTargetMeasure();
  };

  return (
    <View
      ref={ref}
      collapsable={collapsable ?? false}
      onLayout={handleLayout}
      {...rest}
    >
      {children}
    </View>
  );
};

export default TutorialTarget;
