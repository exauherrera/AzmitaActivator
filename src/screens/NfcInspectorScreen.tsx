import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
    interpolate,
    Easing
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import nfcService from '../services/nfcService';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const NfcInspectorScreen = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [tagData, setTagData] = useState<any>(null);
    const [extractedHash, setExtractedHash] = useState<string | null>(null);

    // Animations
    const ring1 = useSharedValue(0);
    const ring2 = useSharedValue(0);
    const iconScale = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        ring1.value = withRepeat(withDelay(0, withTiming(1, { duration: 3000 })), -1);
        ring2.value = withRepeat(withDelay(1500, withTiming(1, { duration: 3000 })), -1);
        iconScale.value = withRepeat(
            withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
            -1
        );
        rotation.value = withRepeat(
            withTiming(360, { duration: 4000, easing: Easing.linear }),
            -1
        );
    }, []);

    const radarSweepStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
        opacity: loading ? 1 : 0.4,
    }));

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring1.value, [0, 1], [0.5, 2]) }],
        opacity: interpolate(ring1.value, [0, 0.5, 1], [0, 0.5, 0]),
        borderColor: loading ? '#FFFFFF' : COLORS.azmitaRed,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring2.value, [0, 1], [0.5, 2]) }],
        opacity: interpolate(ring2.value, [0, 0.5, 1], [0, 0.5, 0]),
        borderColor: loading ? '#FFFFFF' : COLORS.azmitaRed,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    const handleScan = async () => {
        setLoading(true);
        setTagData(null);
        setExtractedHash(null);
        try {
            const data = await nfcService.readRawTag();
            if (data) {
                setTagData(data);
                const hashRegex = /0x[a-fA-F0-9]{64}/;
                const match = data.ndefMessage?.match(hashRegex);
                if (match) {
                    setExtractedHash(match[0]);
                }
            }
        } catch (err) {
            Alert.alert(t('error'), 'No se pudo leer el tag');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const saved = await AsyncStorage.getItem('saved-inspects');
            const list = saved ? JSON.parse(saved) : [];
            list.unshift({ ...tagData, date: new Date().toISOString() });
            await AsyncStorage.setItem('saved-inspects', JSON.stringify(list.slice(0, 20)));
            Alert.alert(t('success'), t('save_record'));
        } catch (e) {
            Alert.alert(t('error'), 'No se pudo guardar');
        }
    };

    const handleOpenSubscan = async () => {
        if (extractedHash) {
            const url = `https://polkadot.subscan.io/extrinsic/${extractedHash}`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            <Text style={styles.title}>{t('inspector')}</Text>

            <View style={styles.scannerContainer}>
                <View style={styles.animationWrapper}>
                    <Animated.View style={[styles.pulseRing, ring1Style]} />
                    <Animated.View style={[styles.pulseRing, ring2Style]} />

                    {/* Radar Sweep Arc */}
                    <Animated.View style={[styles.sweep, radarSweepStyle]} />

                    <GlassCard style={styles.scanCard}>
                        {loading ? (
                            <ActivityIndicator size="large" color={COLORS.azmitaRed} />
                        ) : (
                            <Animated.View style={iconStyle}>
                                <Ionicons name="search-outline" size={60} color={COLORS.azmitaRed} />
                            </Animated.View>
                        )}
                    </GlassCard>
                </View>
            </View>

            <NeonButton
                title={loading ? t('reading') : t('scan_tag')}
                onPress={handleScan}
                style={styles.scanBtn}
                disabled={loading}
            />

            <ScrollView style={styles.scroll}>
                {tagData && (
                    <GlassCard style={styles.card}>
                        <View style={styles.section}>
                            <Text style={styles.label}>UID</Text>
                            <Text style={styles.value}>{tagData.id}</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>TECNOLOGÍAS</Text>
                            <Text style={styles.subvalue}>{tagData.techTypes.join(', ')}</Text>
                        </View>

                        {tagData.ndefMessage && (
                            <View style={styles.section}>
                                <Text style={styles.label}>MENSAJE NDEF</Text>
                                <Text style={styles.ndefText}>{tagData.ndefMessage}</Text>
                            </View>
                        )}

                        {extractedHash && (
                            <View style={styles.hashSection}>
                                <Text style={styles.hashLabel}>{t('hash_detected')}</Text>
                                <Text style={styles.hashValue}>{extractedHash}</Text>
                                <NeonButton
                                    title={t('subscan_view')}
                                    onPress={handleOpenSubscan}
                                    style={styles.subscanBtn}
                                />
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                                <Text style={styles.saveText}>{t('save_record')}</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                )}

                {!tagData && !loading && (
                    <Text style={styles.empty}>Toca un tag para inspeccionar su contenido interno</Text>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 30,
        letterSpacing: 4,
    },
    scanBtn: {
        marginHorizontal: 20,
        marginBottom: 30,
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 20,
    },
    card: {
        marginBottom: 100,
    },
    section: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230, 57, 70, 0.1)',
        paddingBottom: 10,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 2,
        marginBottom: 8,
    },
    value: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#FFFFFF',
    },
    subvalue: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    ndefText: {
        fontSize: 16,
        fontFamily: 'monospace',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 8,
    },
    hashSection: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
    },
    hashLabel: {
        fontSize: 9,
        fontFamily: 'Orbitron_900Black',
        color: COLORS.azmitaRed,
        textAlign: 'center',
        marginBottom: 10,
    },
    hashValue: {
        fontSize: 11,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 15,
        fontFamily: 'monospace',
    },
    subscanBtn: {
        height: 50,
    },
    actionRow: {
        marginTop: 30,
        alignItems: 'center',
    },
    saveBtn: {
        padding: 10,
    },
    saveText: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 2,
    },
    empty: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 50,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    scannerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 250,
        marginBottom: 20,
    },
    animationWrapper: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 2,
        borderColor: COLORS.azmitaRed,
    },
    scanCard: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sweep: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: 'transparent',
        borderTopColor: 'rgba(230, 57, 70, 0.6)',
        borderRightColor: 'rgba(230, 57, 70, 0.2)',
    }
});

export default NfcInspectorScreen;
