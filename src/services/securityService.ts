import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecurityConfig {
    send_funds: boolean;
    view_seed: boolean;
    azmit_asset: boolean;
    delete_wallet: boolean;
    security_enabled: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
    send_funds: true,
    view_seed: true,
    azmit_asset: true,
    delete_wallet: false,
    security_enabled: false
};

const PIN_KEY = 'user-security-pin';
const CONFIG_KEY = 'user-security-config';

class SecurityService {
    async setPin(pin: string): Promise<boolean> {
        try {
            await AsyncStorage.setItem(PIN_KEY, pin);
            // Auto-enable security if setting a PIN for the first time
            const currentConfig = await this.getConfig();
            if (!currentConfig.security_enabled) {
                await this.updateConfig({ ...currentConfig, security_enabled: true });
            }
            return true;
        } catch (e) {
            console.error('Error setting PIN:', e);
            return false;
        }
    }

    async verifyPin(inputPin: string): Promise<boolean> {
        try {
            const storedPin = await AsyncStorage.getItem(PIN_KEY);
            return storedPin === inputPin;
        } catch (e) {
            console.error('Error verifying PIN:', e);
            return false;
        }
    }

    async hasPin(): Promise<boolean> {
        const pin = await AsyncStorage.getItem(PIN_KEY);
        return !!pin;
    }

    async getConfig(): Promise<SecurityConfig> {
        try {
            const json = await AsyncStorage.getItem(CONFIG_KEY);
            if (json) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(json) };
            }
            return DEFAULT_CONFIG;
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    async updateConfig(newConfig: SecurityConfig): Promise<boolean> {
        try {
            await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
            return true;
        } catch (e) {
            console.error('Error updating security config:', e);
            return false;
        }
    }

    async shouldAskPin(action: keyof Omit<SecurityConfig, 'security_enabled'>): Promise<boolean> {
        const config = await this.getConfig();
        if (!config.security_enabled) return false;

        // If security is globally enabled, check the specific action
        return config[action];
    }
}

export default new SecurityService();
