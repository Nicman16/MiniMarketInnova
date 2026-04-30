import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minimarket.innova',
  appName: 'MiniMarket Innova',
  webDir: 'build',
  server: {
    // Descomenta esto si quieres probar con hot-reload en red local.
    // url: 'http://192.168.X.X:3002',
    // cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
