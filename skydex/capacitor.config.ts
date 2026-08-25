import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skydex.mobile',
  appName: 'SkyDex',
  // Hosted mode: the native shell loads the live site, so web deploys update the
  // app instantly and the stores only gate the shell itself (V4 Phase 5 decision).
  webDir: 'www',
  server: {
    url: 'https://sky-dex.com',
    // Keep the OAuth redirect chain (Supabase → Google/Apple → callback) inside the
    // webview so the session cookie lands in the app, not an external browser.
    allowNavigation: [
      'sky-dex.com',
      '*.sky-dex.com',
      'iwfgwokchloeiyelpbec.supabase.co',
      'accounts.google.com',
      'appleid.apple.com',
    ],
  },
};

export default config;
