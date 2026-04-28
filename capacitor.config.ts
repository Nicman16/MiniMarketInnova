import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minimarket.innova',
  appName: 'MiniMarket Innova',
  webDir: 'build',
  server: {
    // En desarrollo apunta al servidor local; en producción usa el build estático
    // Descomenta la línea de abajo para desarrollo con hot-reload:
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
