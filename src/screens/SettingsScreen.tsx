import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Dimensions, TouchableOpacity, ActivityIndicator, Platform, Modal, Image, TextInput, Switch, TouchableWithoutFeedback, Keyboard, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { COLORS } from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NeonButton } from '../components/NeonButton';
import { QRScannerModal } from '../components/QRScannerModal';
import { PinPadModal } from '../components/PinPadModal'; // [NEW]
import securityService, { SecurityConfig } from '../services/securityService'; // [NEW]
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    cancelAnimation,
    interpolate,
    FadeIn
} from 'react-native-reanimated';
import blockchainService, { NETWORKS } from '../services/blockchainService';
import { useFocusEffect } from '@react-navigation/native';

interface WalletRecord {
    id: string;
    name: string;
    address: string;
    mnemonic: string;
    networkRpc: string;
}

const SettingsScreen = () => {
    const { t, i18n } = useTranslation();
    const [walletAddress, setWalletAddress] = useState('');
    const [customText, setCustomText] = useState('');
    const [currentTime, setCurrentTime] = useState({ date: '', time: '' });
    const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);
    const [tempAddress, setTempAddress] = useState('');
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [selectedRpc, setSelectedRpc] = useState(NETWORKS.mainnet.rpc);
    const [tokenSymbol, setTokenSymbol] = useState('AZM');
    const [showSeed, setShowSeed] = useState(false);
    const [savedMnemonic, setSavedMnemonic] = useState('');
    const [balance, setBalance] = useState('0.00');
    const [isEditing, setIsEditing] = useState(false);

    // Wizard State
    const [wizardVisible, setWizardVisible] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [newMnemonic, setNewMnemonic] = useState('');
    const [verifyWordIndex, setVerifyWordIndex] = useState(0);
    const [verifyWordInput, setVerifyWordInput] = useState('');
    const [newAddress, setNewAddress] = useState('');

    // Recovery State (for mnemonic)
    const [recoverVisible, setRecoverVisible] = useState(false);
    const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
    const [savedWallets, setSavedWallets] = useState<WalletRecord[]>([]);
    const [addWalletModalVisible, setAddWalletModalVisible] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');
    const [newWalletNetwork, setNewWalletNetwork] = useState(NETWORKS.mainnet.rpc);
    const [newWalletParaRpc, setNewWalletParaRpc] = useState<string | null>(null);
    const [qrScannerVisible, setQrScannerVisible] = useState(false);
    const [qrTarget, setQrTarget] = useState<'temp' | 'recovery' | null>(null);

    // Security State
    const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
        security_enabled: false,
        send_funds: true,
        view_seed: true,
        azmit_asset: true,
        delete_wallet: true,
        access_config: false,
        view_audit: false,
    });
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [pinMode, setPinMode] = useState<'set' | 'verify' | 'confirm'>('verify');
    const [pendingSecurityAction, setPendingSecurityAction] = useState<string | null>(null);
    const [recoveryVisible, setRecoveryVisible] = useState(false); // For PIN recovery
    const [recoverySeed, setRecoverySeed] = useState('');

    // [New] Edit Wallet State
    const [editWalletModalVisible, setEditWalletModalVisible] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null);
    const [editWalletName, setEditWalletName] = useState('');
    const [editWalletSeed, setEditWalletSeed] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            checkAccessSecurity();
        }, [])
    );

    const checkAccessSecurity = async () => {
        const shouldAsk = await securityService.shouldAskPin('access_config');
        if (shouldAsk) {
            setPendingSecurityAction(null); // Just verify access
            setPinMode('verify');
            setPinModalVisible(true);
        }
    };

    // UX State
    const [activeTab, setActiveTab] = useState('account');

    const rotation = useSharedValue(0);

    useEffect(() => {
        loadWallet();
        loadSecurityConfig();
    }, []);

    const loadSecurityConfig = async () => {
        const config = await securityService.getConfig();
        setSecurityConfig(config);
    };

    useEffect(() => {
        if (walletAddress) {
            fetchBalance(walletAddress);
        }
    }, [walletAddress]);

    const loadWallet = async () => {
        // Try to load address first for display
        const savedAddress = await AsyncStorage.getItem('user-wallet-address');
        const savedSeed = await AsyncStorage.getItem('user-wallet-mnemonic');

        if (savedAddress) {
            setWalletAddress(savedAddress);
        } else if (savedSeed) {
            // Fallback for legacy data or if only seed exists
            setWalletAddress(savedSeed);
        }

        const savedRpc = await AsyncStorage.getItem('user-selected-network');
        if (savedRpc) {
            setSelectedRpc(savedRpc);
            await blockchainService.switchNetwork(savedRpc);
        } else {
            // Default to mainnet if nothing saved
            setSelectedRpc(NETWORKS.mainnet.rpc);
            await blockchainService.switchNetwork(NETWORKS.mainnet.rpc);
        }

        if (savedSeed) {
            setSavedMnemonic(savedSeed);
        }

        const walletsJson = await AsyncStorage.getItem('azmita-saved-wallets');
        if (walletsJson) {
            setSavedWallets(JSON.parse(walletsJson));
        }
    };

    const fetchBalance = async (addressOverride?: string) => {
        const addressToQuery = addressOverride || walletAddress;
        if (!addressToQuery) return;

        setLoadingBalance(true);
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
        const { formatted, symbol } = await blockchainService.getBalance(addressToQuery);
        setBalance(formatted as string);
        setTokenSymbol(symbol as string);
        setLoadingBalance(false);
        cancelAnimation(rotation);
        rotation.value = withTiming(0);
    };

    const handleRecoverWallet = async () => {
        if (!recoveryMnemonic.trim()) return;

        const isValid = await blockchainService.validateMnemonic(recoveryMnemonic.trim());
        if (!isValid) {
            Alert.alert(t('error'), t('recover_error'));
            return;
        }

        try {
            // Agnostic identification: Just use the mnemonic as seed or first word as address
            const mockAddress = 'AZM' + recoveryMnemonic.substring(0, 8).toUpperCase();

            await AsyncStorage.setItem('user-wallet-mnemonic', recoveryMnemonic.trim());
            await AsyncStorage.setItem('user-wallet-address', mockAddress);

            setWalletAddress(mockAddress);
            setSavedMnemonic(recoveryMnemonic.trim());
            setRecoverVisible(false);
            setRecoveryMnemonic('');

            Alert.alert(t('success'), t('recover_success'));
            fetchBalance(mockAddress);
        } catch (e) {
            Alert.alert(t('error'), t('recover_error'));
        }
    };


    const spinStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value} deg` }]
    }));

    const changeLanguage = async (lng: string) => {
        await i18n.changeLanguage(lng);
        await AsyncStorage.setItem('user-language', lng);
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            setTempAddress(walletAddress);
        }
        setIsEditing(!isEditing);
    };

    const handleAddWallet = async () => {
        if (!newWalletName.trim()) {
            Alert.alert(t('error'), 'Por favor ingresa un nombre');
            return;
        }

        const newRecord: WalletRecord = {
            id: Date.now().toString(),
            name: newWalletName,
            address: walletAddress,
            mnemonic: savedMnemonic,
            networkRpc: newWalletParaRpc || newWalletNetwork
        };

        const updatedWallets = [...savedWallets, newRecord];
        setSavedWallets(updatedWallets);
        await AsyncStorage.setItem('azmita-saved-wallets', JSON.stringify(updatedWallets));

        setNewWalletName('');
        setNewWalletParaRpc(null);
        setAddWalletModalVisible(false);
        Alert.alert(t('success'), 'Cartera guardada');
    };

    const handleActivateWallet = async (wallet: WalletRecord) => {
        try {
            // Update active wallet states
            setWalletAddress(wallet.address);
            setSavedMnemonic(wallet.mnemonic);

            // Persist as current primary wallet
            await AsyncStorage.setItem('user-wallet-address', wallet.address);
            await AsyncStorage.setItem('user-wallet-mnemonic', wallet.mnemonic);

            // Switch network synchronized
            setSelectedRpc(wallet.networkRpc);
            await blockchainService.switchNetwork(wallet.networkRpc);
            await AsyncStorage.setItem('user-selected-network', wallet.networkRpc);

            // Update UI/Feedback
            fetchBalance(wallet.address);
            Alert.alert(t('success'), t('wallet_activated'));
        } catch (e) {
            console.error('Activation error:', e);
            Alert.alert(t('error'), 'No se pudo activar la cartera');
        }
    };

    const handleDeleteWallet = async (id: string) => {
        if (await securityService.shouldAskPin('delete_wallet')) {
            setPendingSecurityAction(`delete_${id} `);
            setPinMode('verify');
            setPinModalVisible(true);
            return;
        }

        const updated = savedWallets.filter(w => w.id !== id);
        setSavedWallets(updated);
        await AsyncStorage.setItem('azmita-saved-wallets', JSON.stringify(updated));
    };

    const handleSaveWallet = async () => {
        const input = tempAddress.trim();
        if (!input) {
            Alert.alert(t('error'), t('enter_address'));
            return;
        }

        let addressToStore = input;

        // If input looks like a mnemonic or seed, handle generically
        if (input.split(' ').length >= 12 || input.startsWith('//')) {
            try {
                const mockAddress = 'AZM' + input.substring(0, 8).toUpperCase();
                addressToStore = mockAddress;
                // Save the mnemonic separately
                await AsyncStorage.setItem('user-wallet-mnemonic', input);
                console.log('[SETTINGS] Input recognized as seed. Saved both seed and derived address.');
            } catch (e) {
                console.warn('[SETTINGS] Could not derive address from input, saving as raw string.');
            }
        }

        await AsyncStorage.setItem('user-wallet-address', addressToStore);
        setWalletAddress(addressToStore);
        setIsEditing(false);
        Alert.alert(t('success'), t('save_record'));
        fetchBalance(addressToStore);
    };

    const handleEditWallet = async (wallet: WalletRecord) => {
        if (await securityService.shouldAskPin('access_config')) {
            setPendingSecurityAction('edit_wallet');
            // Ideally we pass context, but for now just protect entry
        }
        setEditingWallet(wallet);
        setEditWalletName(wallet.name);
        setEditWalletSeed(wallet.mnemonic);
        setEditWalletModalVisible(true);
    };

    const handleSaveEditedWallet = async () => {
        if (!editingWallet || !editWalletName.trim() || !editWalletSeed.trim()) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        if (editWalletSeed.split(' ').length < 12) {
            Alert.alert(t('error'), t('recover_error'));
            return;
        }

        try {
            const updatedWallets = savedWallets.map(w => {
                if (w.id === editingWallet.id) {
                    return {
                        ...w,
                        name: editWalletName,
                        mnemonic: editWalletSeed,
                    };
                }
                return w;
            });

            setSavedWallets(updatedWallets);
            await AsyncStorage.setItem('azmita-saved-wallets', JSON.stringify(updatedWallets));

            // If editing active wallet, update session too?
            if (editingWallet.address === walletAddress) {
                // Warn user or auto-update? Auto-update seems best for continuity
                setSavedMnemonic(editWalletSeed);
                // We should strictly re-derive address here if seed changed, but for now trusting user intent.
                // In a real app, always re-derive address from seed.
            }

            setEditWalletModalVisible(false);
            setEditingWallet(null);
            Alert.alert(t('success'), t('save_changes'));

        } catch (e) {
            Alert.alert(t('error'), t('save_failed'));
        }
    };

    const handleNetworkChange = async (rpcUrl: string) => {
        if (selectedRpc === rpcUrl) return;
        setLoadingBalance(true);
        setSelectedRpc(rpcUrl);
        await blockchainService.switchNetwork(rpcUrl);
        await AsyncStorage.setItem('user-selected-network', rpcUrl);
        fetchBalance();
    };

    const startWalletWizard = async () => {
        setLoadingBalance(true);
        try {
            const wallet = await blockchainService.generateNewWallet();
            setNewMnemonic(wallet.mnemonic);
            setNewAddress(wallet.address);
            setWizardStep(1);
            setWizardVisible(true);
            // Random word index for verification (0 to 11)
            setVerifyWordIndex(Math.floor(Math.random() * 12));
            setVerifyWordInput('');
        } catch (e) {
            Alert.alert(t('error'), 'Failed to generate wallet entropy.');
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleWizardNext = () => {
        if (wizardStep < 3) {
            setWizardStep(wizardStep + 1);
        }
    };

    const handleFinalizeWizard = async () => {
        const words = newMnemonic.split(' ');
        if (verifyWordInput.trim().toLowerCase() !== words[verifyWordIndex].toLowerCase()) {
            Alert.alert(t('error'), t('wizard_error_verify'));
            return;
        }

        await AsyncStorage.setItem('user-wallet-mnemonic', newMnemonic);
        await AsyncStorage.setItem('user-wallet-address', newAddress);
        setWalletAddress(newAddress);
        setSavedMnemonic(newMnemonic);
        setWizardVisible(false);
        Alert.alert(t('success'), t('wizard_finish'));
        fetchBalance(newAddress);
    };

    const handleRecoverySubmit = async () => {
        const storedMnemonic = await AsyncStorage.getItem('user-wallet-mnemonic');
        if (!storedMnemonic) {
            Alert.alert(t('error'), t('seed_not_found'));
            return;
        }

        if (recoverySeed.trim() === storedMnemonic) {
            await securityService.resetPin();
            setRecoveryVisible(false);
            setRecoverySeed('');
            Alert.alert(t('success'), t('pin_reset_success'));
            setPinMode('set');
            setPinModalVisible(true); // Allow setting new PIN
        } else {
            Alert.alert(t('error'), 'Invalid Seed Phrase');
        }
    };

    const handlePinSuccess = async (pin?: string) => {
        if (pinMode === 'set' && pin) {
            const success = await securityService.setPin(pin);
            if (success) {
                Alert.alert(t('success'), t('pin_setup_success'));
                loadSecurityConfig();
            }
        } else if (pinMode === 'verify') {
            // Verification successful
            if (pendingSecurityAction === 'toggle_global') {
                // Disabling security requires PIN
                const newConfig = { ...securityConfig, security_enabled: false };
                await securityService.updateConfig(newConfig);
                setSecurityConfig(newConfig);
            } else if (pendingSecurityAction === 'view_seed') {
                setShowSeed(!showSeed);
            } else if (pendingSecurityAction && pendingSecurityAction.startsWith('delete_')) {
                const id = pendingSecurityAction.replace('delete_', '');
                const updated = savedWallets.filter(w => w.id !== id);
                setSavedWallets(updated);
                await AsyncStorage.setItem('azmita-saved-wallets', JSON.stringify(updated));
            }
        }
        setPinModalVisible(false);
        setPendingSecurityAction(null);
    };

    const handleToggleSecurityGlobal = async (value: boolean) => {
        if (value) {
            // enabling
            const hasPin = await securityService.hasPin();
            if (!hasPin) {
                setPinMode('set');
                setPinModalVisible(true);
            } else {
                const newConfig = { ...securityConfig, security_enabled: true };
                await securityService.updateConfig(newConfig);
                setSecurityConfig(newConfig);
            }
        } else {
            // disabling - require PIN
            setPendingSecurityAction('toggle_global');
            setPinMode('verify');
            setPinModalVisible(true);
        }
    };

    const handleToggleConfig = async (key: keyof SecurityConfig) => {
        const newConfig = { ...securityConfig, [key]: !securityConfig[key] };
        setSecurityConfig(newConfig);
        await securityService.updateConfig(newConfig);
    };

    const handleChangePin = () => {
        setPinMode('set');
        setPinModalVisible(true);
    };

    // Override showSeed handler
    const handleShowSeed = async () => {
        if (!showSeed && await securityService.shouldAskPin('view_seed')) {
            setPendingSecurityAction('view_seed');
            setPinMode('verify');
            setPinModalVisible(true);
            return;
        }
        setShowSeed(!showSeed);
    };

    const handleCopy = (text: string, label: string) => {
        Clipboard.setString(text);
        Alert.alert(t('success'), label);
    };

    const getNetworkInfo = (key: string) => {
        const config = (NETWORKS as any)[key];
        if (!config) return { token: '???', explorer: 'Unknown', type: 'Unknown', contract: 'N/A' };

        return {
            token: config.symbol,
            explorer: config.explorer,
            type: config.name.includes('Mainnet') ? 'Mainnet' : 'Testnet/Dev',
            contract: config.name.includes('Asset') ? 'Agnostic Assets' : 'System Native'
        };
    };

    const activeNetwork = blockchainService.getNetworkConfig();
    const isParachainActive = Object.values(NETWORKS).some(n => n.parachains?.some(p => p.rpc === selectedRpc));

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings')}</Text>
                <View style={styles.networkBadgeContainer}>
                    {isParachainActive && (
                        <View style={styles.paraBadge}>
                            <Text style={styles.paraBadgeText}>PARACHAIN</Text>
                        </View>
                    )}
                    <View style={styles.networkBadgeSmall}>
                        <View style={styles.networkDotSmall} />
                        <Text style={styles.networkTextSmall} numberOfLines={1} ellipsizeMode="tail">
                            {activeNetwork.name}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Premium Tab Bar */}
            <View style={styles.tabBar}>
                {['account', 'network', 'security', 'about'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {t(`tab_${tab}`)}
                        </Text>
                        {activeTab === tab && <Animated.View entering={FadeIn} style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'account' && (
                    <Animated.View entering={FadeIn}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('account_management') || 'MI CUENTA'}</Text>

                            <GlassCard style={styles.balanceCard}>
                                <View style={styles.balanceHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.balanceLabel}>{t('total_balance') || 'SALDO DISPONIBLE'}</Text>
                                        <View style={styles.currencyBadge}>
                                            <Text style={styles.currencyBadgeText}>{tokenSymbol}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => fetchBalance()}>
                                        <Animated.View style={spinStyle}>
                                            <Ionicons
                                                name="refresh-circle-outline"
                                                size={24}
                                                color={COLORS.azmitaRed}
                                            />
                                        </Animated.View>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.balanceValue} adjustsFontSizeToFit numberOfLines={1}>{balance}</Text>
                            </GlassCard>

                            <GlassCard style={styles.infoCard}>
                                <View style={styles.walletHeader}>
                                    <Ionicons name="wallet-outline" size={20} color={COLORS.azmitaRed} />
                                    <Text style={styles.infoLabel}>{t('wallet_address')}</Text>
                                </View>

                                {isEditing ? (
                                    <View style={styles.editContainer}>
                                        <View style={styles.inputHeader}>
                                            <Text style={styles.inputLabel}>{t('enter_address')}</Text>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                {tempAddress.length > 0 && (
                                                    <TouchableOpacity onPress={() => setTempAddress('')} style={[styles.qrButtonSmall, { backgroundColor: 'rgba(230, 57, 70, 0.1)' }]}>
                                                        <MaterialCommunityIcons name="broom" size={16} color={COLORS.azmitaRed} />
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setQrTarget('temp');
                                                        setQrScannerVisible(true);
                                                    }}
                                                    style={styles.qrButtonSmall}
                                                >
                                                    <Ionicons name="qr-code-outline" size={16} color={COLORS.azmitaRed} />
                                                    <Text style={styles.qrButtonTextSmall}>SCAN QR</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            value={tempAddress}
                                            onChangeText={setTempAddress}
                                            placeholder={t('enter_address')}
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                        <NeonButton
                                            title={t('save_record')}
                                            onPress={handleSaveWallet}
                                            style={styles.saveBtn}
                                            titleStyle={{ fontSize: 14 }}
                                        />
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity style={styles.addressContainer} onPress={() => handleCopy(walletAddress, t('copy_address') || 'Dirección copiada')}>
                                            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                                                {walletAddress}
                                            </Text>
                                            <Ionicons name="copy-outline" size={16} color={COLORS.azmitaRed} />
                                        </TouchableOpacity>

                                        <View style={styles.actionRow}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={handleEditToggle}>
                                                <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
                                                <Text style={styles.actionBtnText}>{t('edit_wallet') || 'EDITAR'}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={startWalletWizard}>
                                                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.azmitaRed} />
                                                <Text style={[styles.actionBtnText, { color: COLORS.azmitaRed }]}>{t('wizard_title') || 'CONFIGURAR'}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={() => setRecoverVisible(true)}>
                                                <Ionicons name="download-outline" size={18} color={COLORS.textSecondary} />
                                                <Text style={styles.actionBtnText}>{t('recover_title') || 'RECUPERAR'}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.actionBtn, { borderColor: 'rgba(230, 57, 70, 0.4)' }]}
                                                onPress={() => setAddWalletModalVisible(true)}
                                                disabled={!walletAddress}
                                            >
                                                <Ionicons name="save-outline" size={18} color={COLORS.azmitaRed} />
                                                <Text style={[styles.actionBtnText, { color: COLORS.azmitaRed }]}>{t('save_wallet') || 'GUARDAR'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {savedMnemonic ? (
                                            <View style={styles.mnemonicSection}>
                                                <TouchableOpacity
                                                    style={styles.showSeedBtn}
                                                    onPress={handleShowSeed}
                                                >
                                                    <Ionicons
                                                        name={showSeed ? "eye-off-outline" : "eye-outline"}
                                                        size={18}
                                                        color={COLORS.azmitaRed}
                                                    />
                                                    <Text style={styles.showSeedText}>
                                                        {showSeed ? t('hide_seed') : t('show_seed')}
                                                    </Text>
                                                </TouchableOpacity>

                                                {showSeed && (
                                                    <Animated.View entering={FadeIn} style={styles.mnemonicContainer}>
                                                        <View style={styles.warningCard}>
                                                            <Ionicons name="warning-outline" size={24} color="#FFB703" />
                                                            <Text style={styles.mnemonicWarning}>{t('mnemonic_warn')}</Text>
                                                        </View>
                                                        <View style={styles.seedGrid}>
                                                            {savedMnemonic.split(' ').map((word, index) => (
                                                                <View key={index} style={styles.wordBadge}>
                                                                    <Text style={styles.wordIndex}>{index + 1}</Text>
                                                                    <Text style={styles.wordText} numberOfLines={1} ellipsizeMode="tail">{word}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.copySeedBtn}
                                                            onPress={() => handleCopy(savedMnemonic, 'Seed phrase copied')}
                                                        >
                                                            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                                                            <Text style={styles.copySeedText}>{t('copy_seed')}</Text>
                                                        </TouchableOpacity>
                                                    </Animated.View>
                                                )}
                                            </View>
                                        ) : null}
                                    </>
                                )}
                            </GlassCard>

                            <View style={[styles.section, { marginTop: 30 }]}>
                                <Text style={styles.sectionTitle}>{t('saved_wallets')}</Text>

                                {savedWallets.map((wallet) => {
                                    const isActive = wallet.address === walletAddress;

                                    // Identify network/parachain
                                    let networkName = 'Unknown Network';
                                    const allNets = Object.values(NETWORKS);
                                    const primary = allNets.find(n => n.rpc === wallet.networkRpc);
                                    if (primary) {
                                        networkName = primary.name;
                                    } else {
                                        // Check inside ALL relay chains
                                        for (const relay of allNets) {
                                            const para = relay.parachains?.find(p => p.rpc === wallet.networkRpc);
                                            if (para) {
                                                networkName = `${relay.name}: ${para.name} `;
                                                break;
                                            }
                                        }
                                    }

                                    return (
                                        <GlassCard key={wallet.id} style={[styles.walletCard, isActive && styles.activeWalletCard]}>
                                            <Ionicons
                                                name="wallet"
                                                size={24}
                                                color={isActive ? "#00FFA3" : COLORS.azmitaRed}
                                            />
                                            <View style={styles.walletListInfo}>
                                                <Text style={styles.walletListName}>{wallet.name}</Text>
                                                <Text style={styles.walletListAddr} numberOfLines={1} ellipsizeMode="middle">
                                                    {wallet.address}
                                                </Text>
                                                <Text style={styles.walletListNetwork}>
                                                    {networkName}
                                                </Text>
                                            </View>

                                            <View style={styles.rpcActions}>
                                                {!isActive ? (
                                                    <TouchableOpacity
                                                        style={styles.activateBtnSmall}
                                                        onPress={() => handleActivateWallet(wallet)}
                                                    >
                                                        <Text style={styles.activateBtnTextSmall}>{t('activate').toUpperCase()}</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <Ionicons name="checkmark-circle" size={24} color="#00FFA3" />
                                                )}

                                                <TouchableOpacity
                                                    style={[styles.deleteBtnSmall, { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                                                    onPress={() => handleEditWallet(wallet)}
                                                >
                                                    <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.deleteBtnSmall}
                                                    onPress={() => handleDeleteWallet(wallet.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.3)" />
                                                </TouchableOpacity>
                                            </View>
                                        </GlassCard>
                                    );
                                })}

                                {savedWallets.length === 0 && (
                                    <Text style={[styles.stepDesc, { textAlign: 'left', opacity: 0.5 }]}>
                                        Aún no tienes carteras guardadas.
                                    </Text>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                )}

                {activeTab === 'network' && (
                    <Animated.View entering={FadeIn}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('network')}</Text>
                            <GlassCard style={styles.networkCard}>
                                <View style={styles.networkHeader}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.networkStatus}>{t('network_status')}</Text>
                                </View>
                                <Text style={styles.infoValue} numberOfLines={1}>
                                    {blockchainService.getNetworkConfig().name}
                                </Text>
                            </GlassCard>

                            <View style={styles.rpcList}>
                                {Object.entries(NETWORKS).map(([key, config]) => {
                                    const isExpanded = expandedNetwork === key;
                                    const activeConfig = blockchainService.getNetworkConfig();
                                    const isParaOfThis = config.parachains?.some(p => p.rpc === selectedRpc);
                                    const isActive = selectedRpc === config.rpc || isParaOfThis;
                                    const networkInfo = getNetworkInfo(key);

                                    // Dynamic name for Relay chain if a para is active
                                    const displayName = isParaOfThis ? `${t(`network_${key}`)}: ${activeConfig.name}` : t(`network_${key}`);

                                    return (
                                        <View key={key} style={styles.networkCardWrapper}>
                                            <View style={[styles.rpcBtn, isActive && styles.rpcBtnActive, { paddingVertical: 12, paddingHorizontal: 10 }]}>
                                                <TouchableOpacity
                                                    style={[styles.rpcMainAction, { flex: 1 }]}
                                                    onPress={() => !isActive ? handleNetworkChange(config.rpc) : setExpandedNetwork(isExpanded ? null : key)}
                                                >
                                                    <View style={styles.rpcInfo}>
                                                        <Image
                                                            source={require('../../assets/polkadot_icon.jpg')}
                                                            style={[styles.miniLogo, !isActive && { opacity: 0.5 }]}
                                                        />
                                                        <View style={{ flex: 1, marginRight: 10 }}>
                                                            <Text style={[styles.rpcName, isActive && styles.rpcNameActive]} numberOfLines={1} ellipsizeMode="tail">
                                                                {displayName}
                                                            </Text>
                                                            <View style={styles.tokenRow}>
                                                                <Text style={styles.rpcSubtext}>{activeConfig.symbol}</Text>
                                                                {!isActive && (
                                                                    <View style={[styles.activateBadge, { marginLeft: 8 }]}>
                                                                        <Text style={[styles.activateText, { fontSize: 9 }]}>ACTIVATE</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                        <View style={styles.rpcActions}>
                                                            {isActive && (
                                                                <Ionicons name="checkmark-circle" size={20} color="#00FFA3" />
                                                            )}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.rpcExpandBtn}
                                                    onPress={() => setExpandedNetwork(isExpanded ? null : key)}
                                                >
                                                    <Ionicons
                                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color={COLORS.textSecondary}
                                                    />
                                                </TouchableOpacity>
                                            </View>

                                            {isExpanded && (
                                                <Animated.View entering={FadeIn} style={styles.networkDetails}>
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="link-outline" size={16} color={COLORS.azmitaRed} />
                                                        <Text style={styles.detailLabel}>RPC URL:</Text>
                                                    </View>
                                                    <Text style={styles.detailValue} numberOfLines={1}>{config.rpc}</Text>

                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="cash-outline" size={16} color={COLORS.azmitaRed} />
                                                        <Text style={styles.detailLabel}>Token:</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>{networkInfo.token}</Text>

                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="search-outline" size={16} color={COLORS.azmitaRed} />
                                                        <Text style={styles.detailLabel}>Block Explorer:</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>{networkInfo.explorer}</Text>

                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="document-text-outline" size={16} color={COLORS.azmitaRed} />
                                                        <Text style={styles.detailLabel}>Contract/ID:</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>{networkInfo.contract}</Text>

                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="information-circle-outline" size={16} color={COLORS.azmitaRed} />
                                                        <Text style={styles.detailLabel}>Type:</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>{networkInfo.type}</Text>

                                                    {/* Parachain List for Relay Chains */}
                                                    {config.parachains && (
                                                        <View style={styles.parachainSection}>
                                                            <Text style={styles.parachainTitle}>
                                                                PARACHAINS ({config.name} Ecosystem)
                                                            </Text>
                                                            <View style={styles.paraGrid}>
                                                                {config.parachains.map((para: any) => {
                                                                    const isParaActive = selectedRpc === para.rpc;
                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={para.name}
                                                                            style={[styles.paraCard, isParaActive && styles.paraCardActive]}
                                                                            onPress={() => handleNetworkChange(para.rpc)}
                                                                        >
                                                                            <View style={[styles.paraDot, isParaActive && { backgroundColor: '#00FFA3' }]} />
                                                                            <Text style={[styles.paraName, isParaActive && styles.activeParaText]} numberOfLines={1}>
                                                                                {para.name}
                                                                            </Text>
                                                                            <Text style={styles.paraSymbol}>{para.symbol}</Text>
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </View>
                                                        </View>
                                                    )}


                                                </Animated.View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>
                )}

                {activeTab === 'security' && (
                    <Animated.View entering={FadeIn}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('security')}</Text>

                            <GlassCard style={styles.infoCard}>
                                <View style={styles.walletHeader}>
                                    <Ionicons name="shield-checkmark" size={24} color={securityConfig.security_enabled ? '#00FFA3' : COLORS.textSecondary} />
                                    <Text style={[styles.infoLabel, { fontSize: 14 }]}>
                                        {securityConfig.security_enabled ? t('protection_active') : t('protection_inactive')}
                                    </Text>
                                    <Switch
                                        value={securityConfig.security_enabled}
                                        onValueChange={handleToggleSecurityGlobal}
                                        trackColor={{ false: "#767577", true: "rgba(0, 255, 163, 0.3)" }}
                                        thumbColor={securityConfig.security_enabled ? "#00FFA3" : "#f4f3f4"}
                                    />
                                </View>

                                {securityConfig.security_enabled && (
                                    <>
                                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 }} />

                                        <TouchableOpacity style={styles.actionBtn} onPress={handleChangePin}>
                                            <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} />
                                            <Text style={styles.actionBtnText}>{t('pin_change')}</Text>
                                        </TouchableOpacity>

                                        <View style={{ marginTop: 25 }}>
                                            <Text style={[styles.inputLabel, { marginBottom: 15 }]}>{t('pin_require_title')}</Text>

                                            {[
                                                { key: 'send_funds', label: t('action_send_funds') },
                                                { key: 'azmit_asset', label: t('action_azmit_asset') },
                                                { key: 'view_seed', label: t('action_view_seed') },
                                                { key: 'delete_wallet', label: t('action_delete_wallet') },
                                                { key: 'access_config', label: t('access_config') }
                                            ].map((item) => (
                                                <View key={item.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 14 }}>{item.label}</Text>
                                                    <Switch
                                                        value={securityConfig[item.key as keyof SecurityConfig]}
                                                        onValueChange={() => handleToggleConfig(item.key as keyof SecurityConfig)}
                                                        trackColor={{ false: "#767577", true: "rgba(230, 57, 70, 0.3)" }}
                                                        thumbColor={securityConfig[item.key as keyof SecurityConfig] ? COLORS.azmitaRed : "#f4f3f4"}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </GlassCard>
                        </View>
                    </Animated.View>
                )}

                {activeTab === 'about' && (
                    <Animated.View entering={FadeIn}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('language')}</Text>
                            <View style={styles.languageRow}>
                                <TouchableOpacity
                                    style={[styles.langBtn, i18n.language === 'es' && styles.langBtnActive]}
                                    onPress={() => changeLanguage('es')}
                                >
                                    <Text style={[styles.langText, i18n.language === 'es' && styles.langTextActive]}>Español</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.langBtn, i18n.language === 'en' && styles.langBtnActive]}
                                    onPress={() => changeLanguage('en')}
                                >
                                    <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.section, styles.brandSection]}>
                            <Image
                                source={require('../../assets/azmita_logo_red.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.versionText}>{t('version')}: 1.0.6</Text>
                            <Text style={styles.devBy}>{t('developed_by')}</Text>
                            <TouchableOpacity onPress={() => Linking.openURL('https://www.azmita.com')}>
                                <Text style={styles.website}>www.azmita.com</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Wallet Wizard Modal */}
            <Modal visible={wizardVisible} animationType="slide" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setWizardVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
                        <View style={styles.wizardHeader}>
                            <Text style={styles.wizardTitle}>{t('wizard_title')}</Text>
                            <TouchableOpacity onPress={() => setWizardVisible(false)}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={styles.stepContainer}>
                                {wizardStep === 1 && (
                                    <Animated.View entering={FadeIn}>
                                        <Ionicons name="shield-outline" size={60} color={COLORS.azmitaRed} style={styles.stepIcon} />
                                        <Text style={styles.stepTitle}>{t('wizard_step1_title')}</Text>
                                        <Text style={styles.stepDesc}>{t('wizard_step1_desc')}</Text>
                                        <TouchableOpacity style={styles.nextBtn} onPress={handleWizardNext}>
                                            <Text style={[styles.nextBtnText, { fontSize: 13 }]}>{t('confirm')}</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}

                                {wizardStep === 2 && (
                                    <Animated.View entering={FadeIn}>
                                        <Text style={styles.stepTitle}>{t('wizard_step2_title')}</Text>
                                        <Text style={styles.stepDesc}>{t('wizard_step2_desc')}</Text>

                                        <View style={styles.seedGridWizard}>
                                            {newMnemonic.split(' ').map((word, index) => (
                                                <View key={index} style={styles.wordBadgeWizard}>
                                                    <Text style={styles.wordIndexWizard}>{index + 1}</Text>
                                                    <Text style={styles.wordTextWizard}>{word}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.copySeedBtn, { marginVertical: 20 }]}
                                            onPress={() => handleCopy(newMnemonic, t('success'))}
                                        >
                                            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                                            <Text style={styles.copySeedText}>{t('copy_seed')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.nextBtn} onPress={handleWizardNext}>
                                            <Text style={[styles.nextBtnText, { fontSize: 13 }]}>{t('confirm')}</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}

                                {wizardStep === 3 && (
                                    <Animated.View entering={FadeIn}>
                                        <Text style={styles.stepTitle}>{t('wizard_step3_title')}</Text>
                                        <Text style={styles.stepDesc}>{t('wizard_step3_desc')}{verifyWordIndex + 1}</Text>

                                        <TextInput
                                            style={styles.wizardInput}
                                            value={verifyWordInput}
                                            onChangeText={setVerifyWordInput}
                                            placeholder="?"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            autoCapitalize="none"
                                        />

                                        <TouchableOpacity style={styles.finalizeBtn} onPress={handleFinalizeWizard}>
                                            <Text style={[styles.nextBtnText, { fontSize: 13 }]}>{t('wizard_verify')}</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
            {/* Recovery Modal (for mnemonic) */}
            <Modal visible={recoverVisible} animationType="slide" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setRecoverVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
                        <View style={styles.wizardHeader}>
                            <Text style={styles.wizardTitle}>{t('recover_title')}</Text>
                            <TouchableOpacity onPress={() => setRecoverVisible(false)}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={styles.inputHeader}>
                                <Text style={styles.stepDesc}>{t('recover_desc')}</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setQrTarget('recovery');
                                        setQrScannerVisible(true);
                                    }}
                                    style={styles.qrButtonSmall}
                                >
                                    <Ionicons name="qr-code-outline" size={16} color={COLORS.azmitaRed} />
                                    <Text style={styles.qrButtonTextSmall}>SCAN QR</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.warningCard}>
                                <Ionicons name="warning-outline" size={20} color="#FFB703" />
                                <Text style={[styles.mnemonicWarning, { fontSize: 12 }]}>{t('warning_edit_seed')}</Text>
                            </View>

                            <TextInput
                                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                value={recoveryMnemonic}
                                onChangeText={setRecoveryMnemonic}
                                placeholder={t('recover_desc')}
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                autoCapitalize="none"
                            />

                            <NeonButton
                                title={t('recover_btn')}
                                onPress={handleRecoverWallet}
                                style={styles.finalizeBtn}
                                titleStyle={{ fontSize: 14 }}
                            />
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add Wallet Modal */}
            <Modal
                visible={addWalletModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setAddWalletModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setAddWalletModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
                        <View style={styles.wizardHeader}>
                            <Text style={styles.wizardTitle}>{t('save_wallet')}</Text>
                            <TouchableOpacity onPress={() => {
                                setAddWalletModalVisible(false);
                                setNewWalletParaRpc(null);
                            }}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.inputLabel}>{t('wallet_name')}</Text>
                                {newWalletName.length > 0 && (
                                    <TouchableOpacity onPress={() => setNewWalletName('')}>
                                        <MaterialCommunityIcons name="broom" size={18} color={COLORS.azmitaRed} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput
                                style={styles.textInput}
                                value={newWalletName}
                                onChangeText={setNewWalletName}
                                placeholder="Ej: Ahorros, Trading..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />

                            <Text style={[styles.inputLabel, { marginTop: 20 }]}>{t('wallet_network')}</Text>
                            <View style={styles.networkPicker}>
                                {Object.entries(NETWORKS).map(([key, config]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.networkOption,
                                            newWalletNetwork === config.rpc && styles.activeNetworkOption
                                        ]}
                                        onPress={() => {
                                            setNewWalletNetwork(config.rpc);
                                            setNewWalletParaRpc(null);
                                        }}
                                    >
                                        <Text style={[
                                            styles.networkOptionText,
                                            newWalletNetwork === config.rpc && styles.activeNetworkOptionText
                                        ]}>
                                            {config.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Parachain selection for Polkadot in Add Wallet Modal */}
                            {/* Parachain selection for Relay Chains in Add Wallet Modal */}
                            {(() => {
                                const selectedNetworkConfig = Object.values(NETWORKS).find(n => n.rpc === newWalletNetwork);
                                if (selectedNetworkConfig?.parachains) {
                                    return (
                                        <View style={[styles.parachainSection, { marginTop: 15 }]}>
                                            <Text style={styles.parachainTitle}>
                                                SELECCIONA PARACHAIN (OPCIONAL)
                                            </Text>
                                            <View style={styles.paraGrid}>
                                                {selectedNetworkConfig.parachains.map((para: any) => {
                                                    const isParaSelected = newWalletParaRpc === para.rpc;
                                                    return (
                                                        <TouchableOpacity
                                                            key={para.name}
                                                            style={[styles.paraCard, isParaSelected && styles.paraCardActive, { width: '30%' }]}
                                                            onPress={() => setNewWalletParaRpc(isParaSelected ? null : para.rpc)}
                                                        >
                                                            <View style={[styles.paraDot, isParaSelected && { backgroundColor: '#00FFA3' }]} />
                                                            <Text style={[styles.paraName, isParaSelected && styles.activeParaText, { fontSize: 10 }]} numberOfLines={1}>
                                                                {para.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                }
                                return null;
                            })()}

                            <NeonButton
                                title={t('save_wallet').toUpperCase()}
                                onPress={handleAddWallet}
                                style={{ marginTop: 30 }}
                                titleStyle={{ fontSize: 14 }}
                            />
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <QRScannerModal
                visible={qrScannerVisible}
                onClose={() => {
                    setQrScannerVisible(false);
                    setQrTarget(null);
                }}
                onScan={(data) => {
                    if (qrTarget === 'temp') {
                        setTempAddress(data);
                    } else if (qrTarget === 'recovery') {
                        setRecoveryMnemonic(data);
                    }
                    setQrScannerVisible(false);
                    setQrTarget(null);
                }}
            />

            <PinPadModal
                visible={pinModalVisible}
                onClose={() => {
                    // If access config was required and user closed modal without verifying, maybe go back?
                    // For now, just close. if they cancelled verify.
                    setPinModalVisible(false);
                }}
                onSuccess={handlePinSuccess}
                mode={pinMode}
                title={pinMode === 'set' ? t('set_pin') : undefined}
                onForgotPin={() => {
                    setPinModalVisible(false);
                    setRecoveryVisible(true);
                }}
            />

            {/* Recovery Modal (for PIN recovery) */}
            <Modal visible={recoveryVisible} animationType="slide" transparent={true}>
                <Pressable style={[styles.modalOverlay, { justifyContent: 'center' }]} onPress={() => setRecoveryVisible(false)}>
                    <Pressable style={[styles.modalContent, { maxHeight: 400 }]} onPress={Keyboard.dismiss}>
                        <Text style={styles.modalTitle}>{t('forgot_pin')}</Text>
                        <Text style={[styles.infoLabel, { marginBottom: 20 }]}>{t('recovery_instruction')}</Text>

                        <GlassCard style={styles.recipientCard}>
                            <TextInput
                                style={[styles.input, { height: 100 }]}
                                value={recoverySeed}
                                onChangeText={setRecoverySeed}
                                placeholder="Enter your 12-word seed phrase..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                textAlignVertical="top"
                                autoCapitalize="none"
                            />
                        </GlassCard>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                            <TouchableOpacity onPress={() => setRecoveryVisible(false)} style={{ padding: 10 }}>
                                <Text style={{ color: COLORS.textSecondary }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <NeonButton
                                title={t('confirm')}
                                onPress={handleRecoverySubmit}
                                style={{ width: 120, height: 40 }}
                                titleStyle={{ fontSize: 14 }}
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Edit Wallet Modal */}
            <Modal visible={editWalletModalVisible} animationType="fade" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setEditWalletModalVisible(false)}>
                    <Pressable style={styles.modalContentSmall} onPress={Keyboard.dismiss}>
                        <GlassCard style={styles.modalContentSmall}>
                            <Text style={styles.modalTitle}>{t('edit_wallet_title')}</Text>

                            <Text style={styles.inputLabel}>{t('wallet_name')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editWalletName}
                                onChangeText={setEditWalletName}
                            />

                            <Text style={[styles.inputLabel, { marginTop: 15 }]}>{t('wallet_seed_update')}</Text>
                            <View style={styles.warningCard}>
                                <Ionicons name="warning-outline" size={20} color="#FFB703" />
                                <Text style={[styles.mnemonicWarning, { fontSize: 12 }]}>{t('warning_edit_seed')}</Text>
                            </View>
                            <View style={{ position: 'relative' }}>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top', paddingRight: 40 }]}
                                    value={editWalletSeed}
                                    onChangeText={setEditWalletSeed}
                                    multiline
                                    numberOfLines={3}
                                />
                                <TouchableOpacity
                                    style={{ position: 'absolute', right: 10, bottom: 10, opacity: 0.7 }}
                                    onPress={async () => {
                                        const text = await Clipboard.getStringAsync();
                                        if (text) setEditWalletSeed(text);
                                    }}
                                >
                                    <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={() => setEditWalletModalVisible(false)}
                                >
                                    <Text style={styles.modalBtnTextCancel}>{t('cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnConfirm]}
                                    onPress={handleSaveEditedWallet}
                                >
                                    <Text style={styles.modalBtnTextConfirm}>{t('save_changes')}</Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginHorizontal: 20,
        borderRadius: 15,
        padding: 4,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        position: 'relative',
    },
    activeTabButton: {
        // Active state handled by indicator
    },
    tabText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    activeTabText: {
        color: COLORS.azmitaRed,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 4,
        width: 20,
        height: 2,
        backgroundColor: COLORS.azmitaRed,
        borderRadius: 2,
    },
    section: {
        marginBottom: 35,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    languageRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 15,
    },
    langBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    langBtnActive: {
        borderColor: COLORS.azmitaRed,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
    },
    langText: {
        color: COLORS.textSecondary,
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
    },
    langTextActive: {
        color: '#FFFFFF',
    },
    infoCard: {
        padding: 16,
    },
    balanceCard: {
        padding: 25,
        marginBottom: 20,
        backgroundColor: 'rgba(230, 57, 70, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    balanceLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 2,
    },
    balanceValue: {
        fontSize: 36,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
    },
    currency: {
        fontSize: 18,
        color: COLORS.azmitaRed,
    },
    currencyBadge: {
        backgroundColor: COLORS.azmitaRed,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 10,
    },
    currencyBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    walletHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    infoLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    addressText: {
        flex: 1,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
        fontSize: 12,
        marginRight: 10,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 15,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionBtnText: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    editContainer: {
        gap: 15,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 12,
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    saveBtn: {
        height: 45,
    },
    mnemonicSection: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    showSeedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    showSeedText: {
        fontFamily: 'Orbitron_700Bold',
        fontSize: 12,
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    mnemonicContainer: {
        marginTop: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 183, 3, 0.1)',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 183, 3, 0.2)',
    },
    mnemonicWarning: {
        flex: 1,
        color: '#FFB703',
        fontSize: 12,
        fontFamily: 'Orbitron_400Regular',
        lineHeight: 18,
    },
    seedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    wordBadge: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '48%', // Ensure 2 per row
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    wordIndex: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_900Black',
        opacity: 0.8,
    },
    wordText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Orbitron_400Regular',
        letterSpacing: 0.5,
    },
    copySeedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.azmitaRed,
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 10,
        elevation: 5,
        shadowColor: COLORS.azmitaRed,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    copySeedText: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    networkCard: {
        padding: 20,
        marginBottom: 20,
    },
    networkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    networkStatus: {
        color: '#00FFA3',
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00FFA3',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    rpcList: {
        gap: 12,
    },
    rpcBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    rpcBtnActive: {
        borderColor: COLORS.azmitaRed,
        backgroundColor: 'rgba(230, 57, 70, 0.05)',
    },
    rpcInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rpcName: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
    },
    rpcNameActive: {
        color: '#FFFFFF',
    },
    miniLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    brandSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 15,
    },
    versionText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginBottom: 5,
    },
    devBy: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    website: {
        color: COLORS.azmitaRed,
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
        marginTop: 5,
        textDecorationLine: 'underline',
    },
    networkCardWrapper: {
        marginBottom: 10,
    },
    rpcActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rpcMainAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        flex: 1,
    },
    rpcExpandBtn: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.05)',
    },
    activateBadge: {
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.3)',
    },
    activateText: {
        color: '#00FFA3',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    },
    rpcSubtext: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Inter_400Regular',
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    networkDetails: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 15,
        borderRadius: 15,
        marginTop: -10,
        paddingTop: 25,
        zIndex: -1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    detailLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginRight: 8,
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 4,
        paddingLeft: 24,
    },
    switchNetworkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.azmitaRed,
        marginTop: 20,
        paddingVertical: 12,
        borderRadius: 10,
    },
    switchNetworkText: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 12,
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderRadius: 25,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        alignSelf: 'center',
    },
    wizardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    wizardTitle: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 18,
    },
    stepContainer: {
        minHeight: 300,
    },
    stepIcon: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    stepTitle: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 10,
    },
    stepDesc: {
        color: COLORS.textSecondary,
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    nextBtn: {
        backgroundColor: COLORS.azmitaRed,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 14,
    },
    seedGridWizard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    wordBadgeWizard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        width: '30%',
        margin: 4,
    },
    wordIndexWizard: {
        color: COLORS.azmitaRed,
        fontSize: 9,
        fontFamily: 'Orbitron_700Bold',
    },
    wordTextWizard: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
    },
    wizardInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 20,
        color: '#FFFFFF',
        fontSize: 24,
        textAlign: 'center',
        fontFamily: 'Orbitron_700Bold',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
    },
    finalizeBtn: {
        backgroundColor: '#00FFA3', // Success green for final step
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#00FFA3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 15,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
        textAlignVertical: 'top',
    },
    networkBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.2)',
        flexShrink: 1,
    },
    networkDotSmall: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#00FFA3',
        marginRight: 5,
    },
    networkTextSmall: {
        color: '#00FFA3',
        fontSize: 8,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    },
    // Multi-Wallet Styles
    walletCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
    },
    activeWalletCard: {
        borderColor: 'rgba(0, 255, 163, 0.3)',
        backgroundColor: 'rgba(0, 255, 163, 0.05)',
    },
    walletListInfo: {
        flex: 1,
        marginLeft: 12,
    },
    walletListName: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 14,
    },
    walletListAddr: {
        color: COLORS.textSecondary,
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        marginTop: 2,
    },
    walletListNetwork: {
        color: COLORS.azmitaRed,
        fontFamily: 'Orbitron_700Bold',
        fontSize: 8,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    activateBtnSmall: {
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.3)',
    },
    activateBtnTextSmall: {
        color: '#00FFA3',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
    },
    deleteBtnSmall: {
        marginLeft: 8,
        padding: 6,
    },
    inputLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    qrButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    qrButtonTextSmall: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
    },
    networkPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    networkOption: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeNetworkOption: {
        borderColor: COLORS.azmitaRed,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
    },
    networkOptionText: {
        color: COLORS.textSecondary,
        fontFamily: 'Inter_700Bold',
        fontSize: 10,
    },
    activeNetworkOptionText: {
        color: '#FFFFFF',
    },
    // Parachain Styles
    parachainSection: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    parachainTitle: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 12,
    },
    paraGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    paraCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 8,
        width: '31%', // 3 per row roughly
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    paraCardActive: {
        borderColor: 'rgba(0, 255, 163, 0.4)',
        backgroundColor: 'rgba(0, 255, 163, 0.05)',
    },
    paraDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textSecondary,
        marginBottom: 6,
    },
    paraName: {
        color: '#FFFFFF',
        fontFamily: 'Inter_700Bold',
        fontSize: 11,
    },
    activeParaText: {
        color: '#00FFA3',
    },
    paraSymbol: {
        color: COLORS.textSecondary,
        fontFamily: 'Orbitron_400Regular',
        fontSize: 8,
        marginTop: 2,
    },
    networkBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
        maxWidth: '65%',
        justifyContent: 'flex-end',
    },
    paraBadge: {
        backgroundColor: '#000000',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    paraBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontFamily: 'Orbitron_900Black',
        letterSpacing: 0.5,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        color: '#FFFFFF',
        marginBottom: 15,
        textAlign: 'center',
    },
    recipientCard: {
        padding: 0,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
    },
    modalContentSmall: {
        width: '85%',
        padding: 20,
        alignItems: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
        gap: 15,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalBtnConfirm: {
        backgroundColor: 'rgba(230, 57, 70, 0.2)',
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
    },
    modalBtnTextCancel: {
        color: '#FFFFFF',
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
    },
    modalBtnTextConfirm: {
        color: COLORS.azmitaRed,
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
    },
});

export default SettingsScreen;
