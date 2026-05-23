'use strict';

const preset = require('./node_modules/jest-expo/jest-preset.js');

module.exports = {
  ...preset,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/'
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
};
