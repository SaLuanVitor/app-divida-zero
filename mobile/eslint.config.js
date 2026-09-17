// Flat ESLint config for the Expo / React Native + TypeScript mobile app.
// Based on the community Expo preset (eslint-config-expo).
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
    ...expoConfig,
    {
        ignores: [
            'node_modules/**',
            'android/**',
            'ios/**',
            '.expo/**',
            'dist/**',
            'scripts/**',
            'babel.config.js',
            'metro.config.js',
            'jest.config.js',
            'jest.setup.ts',
            'eslint.config.js',
        ],
    },
    {
        rules: {
            // Surface unused code as warnings (non-blocking) and allow
            // intentionally-unused args/vars prefixed with underscore.
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
            ],
            'no-unused-vars': 'off',

            // The Expo preset enables the experimental React Compiler
            // diagnostics from eslint-plugin-react-hooks v6. These are
            // optimization/purity hints (not runtime crashes) and produce many
            // findings across this legacy codebase. Keep them visible as
            // warnings instead of hard errors so `npm run lint` stays green and
            // the base config is usable; they can be addressed incrementally.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/static-components': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',

            // Stylistic: downgrade to warnings.
            'react/display-name': 'warn',
            'react/no-unescaped-entities': 'warn',
        },
    },
];
