import React from 'react';
import { View } from 'react-native';
import { getProfileFrameOption, getProfileIconOption } from '../utils/profileAppearance';

type ProfileAvatarProps = {
  iconKey?: string | null;
  frameKey?: string | null;
  size?: number;
  iconSize?: number;
};

const ProfileAvatar = ({ iconKey, frameKey, size = 96, iconSize = 40 }: ProfileAvatarProps) => {
  const iconOption = getProfileIconOption(iconKey);
  const frameOption = getProfileFrameOption(frameKey);
  const Icon = iconOption.icon;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: frameOption.borderWidth,
        borderColor: frameOption.borderColor,
        backgroundColor: frameOption.backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={iconSize} color="#f48c25" />
    </View>
  );
};

export default ProfileAvatar;

