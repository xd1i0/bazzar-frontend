import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'bazzar',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    // WKWebView configuration for better iOS rendering
    webContentsDebuggingEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  }
};

export default config;
