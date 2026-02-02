import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
    en: {
        translation: {
            welcome: 'Welcome to Azmita',
            select_language: 'Select your language',
            azmitar: 'Azmitar',
            vault: 'Vault',
            scan_chip: 'Scan NFC Chip',
            authenticating: 'Authenticating...',
            success: 'Success',
            error: 'Error',
            category_luxury: 'Luxury',
            category_art: 'Art',
            category_automotive: 'Automotive',
            start_activation: 'Start Activation',
            processing_blockchain: 'Processing on Polkadot...',
            azmitado: 'AZMITADO',
        }
    },
    es: {
        translation: {
            welcome: 'Bienvenido a Azmita',
            select_language: 'Selecciona tu idioma',
            azmitar: 'Azmitar',
            vault: 'Bóveda',
            scan_chip: 'Escanear Chip NFC',
            authenticating: 'Autenticando...',
            success: 'Éxito',
            error: 'Error',
            category_luxury: 'Lujo',
            category_art: 'Arte',
            category_automotive: 'Automotriz',
            start_activation: 'Iniciar Activación',
            processing_blockchain: 'Procesando en Polkadot...',
            azmitado: 'AZMITADO',
        }
    }
};

const getLanguage = () => {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].languageCode) {
        return locales[0].languageCode;
    }
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        }
    });

export default i18n;
