const appJson = require('./app.json');

const DEFAULT_EAS_PROJECT_ID = '5a8a7f70-d513-49fe-a04d-fb97c24e6eea';

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const expo = appJson.expo;

  return {
    ...config,
    ...expo,
    extra: {
      ...(expo.extra || {}),
      eas: {
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
          expo.extra?.eas?.projectId ||
          DEFAULT_EAS_PROJECT_ID,
      },
    },
  };
};
