import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecurityConfig {
    send_funds: boolean;
    view_seed: boolean;
    azmit_asset: boolean;
    delete_wallet: boolean;
    security_enabled: boolean;
    access_config: boolean;
    view_audit: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
    send_funds: true,
    view_seed: true,
    azmit_asset: true,
    delete_wallet: true,
    security_enabled: false,
    access_config: false,
    view_audit: false,
};

const PIN_KEY = 'user-security-pin';
const CONFIG_KEY = 'user-security-config';

class SecurityService {
    async setPin(pin: string): Promise<boolean> {
        try {
            await AsyncStorage.setItem(PIN_KEY, pin);
            // Enable security globally when PIN is set
            await this.updateConfig({
                ...DEFAULT_CONFIG,
                security_enabled: true
            });
            return true;
        } catch (error) {
            console.error('Error setting PIN:', error);
            return false;
        }
    }

    async resetPin(): Promise<boolean> {
        try {
            await AsyncStorage.removeItem(PIN_KEY);
            // Disable security on reset
            await this.updateConfig({
                ...DEFAULT_CONFIG,
                security_enabled: false
            });
            return true;
        } catch (error) {
            console.error('Error resetting PIN:', error);
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
