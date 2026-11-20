import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Extends app.json. `EXPO_BASE_URL` lets the web build be served from a sub-path,
 * e.g. `/malaab` on GitHub Pages; it is unset for native builds and local dev.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
