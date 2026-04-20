import React from 'react';
import { Image, ImageSourcePropType, Text, View } from 'react-native';

type BrandLogoVariant = 'mark' | 'lockup';

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  size?: number;
  titleColor?: string;
  subtitle?: string;
  subtitleColor?: string;
  subtitleSize?: number;
};

const BRAND_MARK = require('../../assets/brand/app-icon.png') as ImageSourcePropType;
const BRAND_SYMBOL = require('../../assets/brand/splash-logo.png') as ImageSourcePropType;

const BrandLogo = ({
  variant = 'mark',
  size = 56,
  titleColor = '#4a2a0a',
  subtitle,
  subtitleColor = '#94a3b8',
  subtitleSize = 12,
}: BrandLogoProps) => {
  if (variant === 'mark') {
    return (
      <Image
        source={BRAND_SYMBOL}
        style={{ width: size, height: size, borderRadius: Math.max(8, Math.round(size * 0.22)) }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        source={BRAND_MARK}
        style={{ width: size, height: size, borderRadius: Math.max(8, Math.round(size * 0.22)) }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <Text
        style={{
          marginTop: 10,
          fontSize: Math.max(20, Math.round(size * 0.42)),
          fontWeight: '800',
          color: titleColor,
          letterSpacing: -0.5,
        }}
      >
        {'D\u00EDvida Zero'}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: subtitleSize,
            fontWeight: '600',
            color: subtitleColor,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

export default BrandLogo;
