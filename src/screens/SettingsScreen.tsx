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
import { NeonButton } from '../components/NeonButton';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    cancelAnimation
} from 'react-native-reanimated';
import blockchainService from '../services/blockchainService';

const SettingsScreen = () => {
    const { t, i18n } = useTranslation();
    const [walletAddress, setWalletAddress] = useState('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    const [balance, setBalance] = useState('0.00');
    const [isEditing, setIsEditing] = useState(false);
    const [tempAddress, setTempAddress] = useState('');
    const [loadingBalance, setLoadingBalance] = useState(false);
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
        const saved = await AsyncStorage.getItem('user-wallet');
        if (saved) setWalletAddress(saved);
    };

    const fetchBalance = async () => {
        setLoadingBalance(true);
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
        const bal = await blockchainService.getBalance(walletAddress);
        setBalance(bal);
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
        if (!tempAddress.trim()) {
            Alert.alert(t('error'), t('enter_address'));
            return;
        }
        await AsyncStorage.setItem('user-wallet', tempAddress);
        setWalletAddress(tempAddress);
        setIsEditing(false);
        Alert.alert(t('success'), t('save_record'));
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
                        setWalletAddress(newWallet.mnemonic);
                        Alert.alert(t('success'), `${t('new_wallet_created')}\n\nAddress: ${newWallet.address}`);
                    }
                }
            ]
        );
    };

    const handleCopy = () => {
        Clipboard.setString(walletAddress);
        Alert.alert(t('success'), t('copy_address') || 'Dirección copiada');
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
                        <Text style={styles.balanceValue}>{balance} <Text style={styles.currency}>DOT</Text></Text>
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
                                <TouchableOpacity style={styles.addressContainer} onPress={handleCopy}>
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
                            </>
                        )}
                    </GlassCard>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('network')}</Text>
                    <GlassCard style={styles.networkCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="globe-outline" size={20} color={COLORS.azmitaRed} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>{t('connected_to')}</Text>
                                <Text style={styles.infoValue}>{networkName}</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>{t('network_status')}</Text>
                            </View>
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
        padding: 16,
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
