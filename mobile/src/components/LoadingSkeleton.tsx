import React from 'react';
import { View } from 'react-native';

type LoadingSkeletonProps = {
  rows?: number;
  height?: number;
  className?: string;
};

const LoadingSkeleton = ({ rows = 3, height = 14, className }: LoadingSkeletonProps) => {
  return (
    <View className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={`sk-${index}`}
          className="bg-slate-200 dark:bg-slate-700 rounded-md mb-2"
          style={{ height, opacity: 1 - index * 0.12 }}
        />
      ))}
    </View>
  );
};

export default LoadingSkeleton;
