export default {
  expo: {
    name: 'FindYoWay',
    slug: 'findyoway',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.findyoway.mobile'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.findyoway.mobile'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      flaskApiUrl: process.env.EXPO_PUBLIC_FLASK_API_URL || 'http://localhost:5000'
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission: 'Allow FindYoWay to access your camera for navigation assistance.'
        }
      ]
    ]
  }
};
