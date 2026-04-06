import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.makerstocks.app',
    appName: 'MakerStock',
    // Angular 17+ (@angular-devkit/build-angular:application) outputs to dist/<project>/browser
    webDir: 'dist/sakai-ng/browser',
    server: {
        androidScheme: 'https'
    },
    android: {
        buildOptions: {
            keystorePath: undefined,
            keystoreAlias: undefined
        }
    },
    plugins: {
        BarcodeScanner: {
            // MLKit barcode scanning — aucune config supplémentaire requise
        }
    }
};

export default config;
