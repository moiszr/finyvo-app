// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Expo + JSX a través de NativeWind
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // 👇 NativeWind es un PRESET (no plugin)
      'nativewind/babel',
    ],
    plugins: [
      // Alias @ → ./src
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Reanimated SIEMPRE de último
      'react-native-reanimated/plugin',
    ],
  };
};
