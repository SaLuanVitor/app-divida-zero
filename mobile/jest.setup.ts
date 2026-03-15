import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  return {
    ...actual,
    default: {
      ...(actual?.default ?? {}),
      install: jest.fn(),
    },
  };
});

jest.mock('react-native-gesture-handler/src/RNGestureHandlerModule', () => ({
  __esModule: true,
  default: { install: jest.fn(() => true) },
}));

jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () => ({
  __esModule: true,
  default: { install: jest.fn(() => true) },
}));

jest.mock('react-native-gesture-handler/lib/module/RNGestureHandlerModule', () => ({
  __esModule: true,
  default: { install: jest.fn(() => true) },
}));
