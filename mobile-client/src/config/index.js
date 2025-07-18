import Constants from 'expo-constants';

// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'http://10.0.2.2:8080/api/v1', // Android emulator localhost
    supabaseUrl: 'https://your-supabase-project.supabase.co',
    supabaseAnonKey: 'your-supabase-anon-key',
  },
  staging: {
    apiUrl: 'https://staging-api.your-domain.com/api/v1',
    supabaseUrl: 'https://your-supabase-project.supabase.co',
    supabaseAnonKey: 'your-supabase-anon-key',
  },
  prod: {
    apiUrl: 'https://api.your-domain.com/api/v1',
    supabaseUrl: 'https://your-supabase-project.supabase.co',
    supabaseAnonKey: 'your-supabase-anon-key',
  },
};

const getEnvVars = (env = Constants.releaseChannel) => {
  // What is __DEV__ ?
  // This variable is set to true when react-native is running in Dev mode.
  // __DEV__ is true when run locally, but false when published.
  if (__DEV__) {
    return ENV.dev;
  } else if (env === 'staging') {
    return ENV.staging;
  } else if (env === 'prod') {
    return ENV.prod;
  } else {
    return ENV.dev;
  }
};

export default getEnvVars;