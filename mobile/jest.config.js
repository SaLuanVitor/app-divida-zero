module.exports = {
  preset: '<rootDir>/node_modules/jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    // O react-native-webview exige o TurboModule nativo RNCWebViewModule, que nao
    // existe no Jest. O navigator raiz importa BankConnectScreen, que carrega esse
    // modulo, entao mapeamos para um stub antes que o arquivo real seja resolvido.
    '^react-native-webview$': '<rootDir>/__mocks__/react-native-webview.js',
  },
};
