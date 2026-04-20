module.exports = {
  preset: '<rootDir>/node_modules/jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};
