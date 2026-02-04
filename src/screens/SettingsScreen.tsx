import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Linking,
    Platform,
    TextInput,
    Alert,
    Clipboard
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyring } from '@polkadot/keyring';
import { NeonButton } from '../components/NeonButton';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    cancelAnimation,
    FadeIn
} from 'react-native-reanimated';
import blockchainService, { NETWORKS } from '../services/blockchainService';

const SettingsScreen = () => {
    const { t, i18n } = useTranslation();
    const [walletAddress, setWalletAddress] = useState('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    const [balance, setBalance] = useState('0.00');
    const [isEditing, setIsEditing] = useState(false);
    const [tempAddress, setTempAddress] = useState('');
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [selectedRpc, setSelectedRpc] = useState(NETWORKS.polkadot);
    const [tokenSymbol, setTokenSymbol] = useState('DOT');
    const [showSeed, setShowSeed] = useState(false);
    const [savedMnemonic, setSavedMnemonic] = useState('');
    const rotation = useSharedValue(0);
    const networkName = 'Polkadot (Development)';

    useEffect(() => {
        loadWallet();
    }, []);

    useEffect(() => {
        if (walletAddress) {
            fetchBalance();
        }
    }, [walletAddress]);

    const loadWallet = async () => {
        // Try to load address first for display
        const savedAddress = await AsyncStorage.getItem('user-wallet-address');
        const savedSeed = await AsyncStorage.getItem('user-wallet');

        if (savedAddress) {
            setWalletAddress(savedAddress);
        } else if (savedSeed) {
            // Fallback for legacy data or if only seed exists
            setWalletAddress(savedSeed);
        }

        const savedRpc = await AsyncStorage.getItem('user-network');
        if (savedRpc) {
            setSelectedRpc(savedRpc);
            await blockchainService.switchNetwork(savedRpc);
        }

        if (savedSeed) {
            setSavedMnemonic(savedSeed);
        }
    };

    const fetchBalance = async () => {
        setLoadingBalance(true);
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
        const { formatted, symbol } = await blockchainService.getBalance(walletAddress);
        setBalance(formatted);
        setTokenSymbol(symbol);
        setLoadingBalance(false);
        cancelAnimation(rotation);
        rotation.value = withTiming(0);
    };

    const spinStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
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

    const handleSaveWallet = async () => {
        const input = tempAddress.trim();
        if (!input) {
            Alert.alert(t('error'), t('enter_address'));
            return;
        }

        let addressToStore = input;

        // If input looks like a mnemonic or seed, derive address
        if (input.split(' ').length >= 12 || input.startsWith('//')) {
            try {
                const keyring = new Keyring({ type: 'sr25519' });
                const pair = keyring.addFromUri(input);
                addressToStore = pair.address;
                // Save the mnemonic separately
                await AsyncStorage.setItem('user-wallet', input);
                console.log('[SETTINGS] Input recognized as seed. Saved both seed and derived address.');
            } catch (e) {
                console.warn('[SETTINGS] Could not derive address from input, saving as raw string.');
            }
        }

        await AsyncStorage.setItem('user-wallet-address', addressToStore);
        setWalletAddress(addressToStore);
        setIsEditing(false);
        Alert.alert(t('success'), t('save_record'));
        fetchBalance();
    };

    const handleNetworkChange = async (rpcUrl: string) => {
        if (selectedRpc === rpcUrl) return;
        setLoadingBalance(true);
        setSelectedRpc(rpcUrl);
        await blockchainService.switchNetwork(rpcUrl);
        await AsyncStorage.setItem('user-network', rpcUrl);
        await fetchBalance();
    };

    const handleGenerateWallet = async () => {
        Alert.alert(
            t('generate_wallet_title') || 'Generar Nueva Wallet',
            t('generate_wallet_warn') || 'Esto reemplazará tu llave actual. Asegúrate de guardar tu nueva dirección.',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('confirm'),
                    onPress: async () => {
                        const newWallet = await blockchainService.generateNewWallet();
                        await AsyncStorage.setItem('user-wallet', newWallet.mnemonic);
                        await AsyncStorage.setItem('user-wallet-address', newWallet.address);
                        setWalletAddress(newWallet.address);
                        setSavedMnemonic(newWallet.mnemonic);
                        setShowSeed(true);
                        Alert.alert(
                            t('success'),
                            `${t('new_wallet_created')}\n\n${t('mnemonic_warn')}`
                        );
                    }
                }
            ]
        );
    };

    const handleCopy = (text: string, label: string) => {
        Clipboard.setString(text);
        Alert.alert(t('success'), label);
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('account_management') || 'MI CUENTA'}</Text>

                    <GlassCard style={styles.balanceCard}>
                        <View style={styles.balanceHeader}>
                            <Text style={styles.balanceLabel}>{t('total_balance') || 'SALDO DISPONIBLE'}</Text>
                            <TouchableOpacity onPress={fetchBalance}>
                                <Animated.View style={spinStyle}>
                                    <Ionicons
                                        name="refresh-circle-outline"
                                        size={24}
                                        color={COLORS.azmitaRed}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.balanceValue}>{balance} <Text style={styles.currency}>{tokenSymbol}</Text></Text>
                    </GlassCard>

                    <GlassCard style={styles.infoCard}>
                        <View style={styles.walletHeader}>
                            <Ionicons name="wallet-outline" size={20} color={COLORS.azmitaRed} />
                            <Text style={styles.infoLabel}>{t('wallet_address')}</Text>
                        </View>

                        {isEditing ? (
                            <View style={styles.editContainer}>
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

                                    <TouchableOpacity style={styles.actionBtn} onPress={handleGenerateWallet}>
                                        <Ionicons name="add-circle-outline" size={18} color={COLORS.azmitaRed} />
                                        <Text style={[styles.actionBtnText, { color: COLORS.azmitaRed }]}>{t('generate_new') || 'GENERAR NUEVA'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {savedMnemonic ? (
                                    <View style={styles.mnemonicSection}>
                                        <TouchableOpacity
                                            style={styles.showSeedBtn}
                                            onPress={() => setShowSeed(!showSeed)}
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
                                                    onPress={() => handleCopy(savedMnemonic, t('success'))}
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
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('network')}</Text>
                    <GlassCard style={styles.networkCard}>
                        <View style={styles.networkHeader}>
                            <Image
                                source={require('../../assets/polkadot_icon.jpg')}
                                style={styles.polkadotLogo}
                            />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>{t('connected_to')}</Text>
                                <Text style={styles.infoValue} numberOfLines={1}>
                                    {selectedRpc === NETWORKS.polkadot ? 'Polkadot Mainnet' :
                                        selectedRpc === NETWORKS.westend ? 'Westend Testnet' : 'Paseo Relay Chain'}
                                </Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>{t('network_status')}</Text>
                            </View>
                        </View>

                        <View style={styles.networkSelector}>
                            <TouchableOpacity
                                style={[styles.networkBtn, selectedRpc === NETWORKS.polkadot && styles.networkBtnActive]}
                                onPress={() => handleNetworkChange(NETWORKS.polkadot)}
                            >
                                <Text style={[styles.networkBtnText, selectedRpc === NETWORKS.polkadot && styles.networkBtnTextActive]}>
                                    MAINNET
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.networkBtn, selectedRpc === NETWORKS.westend && styles.networkBtnActive]}
                                onPress={() => handleNetworkChange(NETWORKS.westend)}
                            >
                                <Text style={[styles.networkBtnText, selectedRpc === NETWORKS.westend && styles.networkBtnTextActive]}>
                                    WESTEND
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.networkBtn, selectedRpc === NETWORKS.paseo && styles.networkBtnActive]}
                                onPress={() => handleNetworkChange(NETWORKS.paseo)}
                            >
                                <Text style={[styles.networkBtnText, selectedRpc === NETWORKS.paseo && styles.networkBtnTextActive]}>
                                    PASEO RELAY
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                <View style={[styles.section, styles.brandSection]}>
                    <Image
                        source={require('../../assets/azmita_logo_red.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.versionText}>{t('version')}: 1.0.5</Text>
                    <Text style={styles.devBy}>{t('developed_by')}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://www.azmita.com')}>
                        <Text style={styles.website}>www.azmita.com</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        marginTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    editAction: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textGhost,
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
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    infoTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    infoLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    walletHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
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
    networkCard: {
        padding: 20,
    },
    networkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    polkadotLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    networkSelector: {
        flexDirection: 'row',
        gap: 10,
    },
    networkBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    networkBtnActive: {
        borderColor: COLORS.azmitaRed,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
    },
    networkBtnText: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    networkBtnTextActive: {
        color: '#FFFFFF',
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.2)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FFA3',
        marginRight: 6,
    },
    statusText: {
        color: '#00FFA3',
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
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
    }
});

export default SettingsScreen;
