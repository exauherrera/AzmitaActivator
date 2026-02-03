import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Dimensions, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
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
import { RadarScanner } from '../components/RadarScanner';
import nfcService from '../services/nfcService';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const NfcInspectorScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [tagData, setTagData] = useState<any>(null);
    const [extractedHash, setExtractedHash] = useState<string | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                nfcService.abort();
                setLoading(false);
            };
        }, [])
    );

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
            Alert.alert(t('error'), t('scan_failed'));
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
            Alert.alert(t('error'), t('save_failed'));
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('inspector')}</Text>
            </View>

            {!tagData && (
                <>
                    <RadarScanner
                        loading={loading}
                        statusText={
                            loading
                                ? t('reading')
                                : t('instruction_scan')
                        }
                        icon={<Ionicons name="search-outline" size={60} color={COLORS.azmitaRed} />}
                    />

                    <NeonButton
                        title={loading ? t('reading') : t('scan_tag')}
                        onPress={handleScan}
                        style={styles.scanBtn}
                        disabled={loading}
                    />
                </>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, tagData && styles.fullScroll]}
                showsVerticalScrollIndicator={false}
            >
                {tagData && (
                    <View style={styles.resultsContainer}>
                        <GlassCard style={styles.uidCard}>
                            <Text style={styles.label}>UID</Text>
                            <Text style={styles.value}>{tagData.id}</Text>
                        </GlassCard>

                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>{t('tech_types')}</Text>
                            <View style={styles.techList}>
                                {tagData.techTypes.map((tech: string, i: number) => (
                                    <View key={i} style={styles.techBadge}>
                                        <Text style={styles.techText}>{tech.split('.').pop()}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {tagData.ndefMessage && (
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>{t('ndef_message')}</Text>
                                <View style={styles.ndefContainer}>
                                    <Text style={styles.ndefText}>{tagData.ndefMessage}</Text>
                                </View>
                            </View>
                        )}

                        {extractedHash && (
                            <View style={styles.hashSection}>
                                <View style={styles.hashHeader}>
                                    <Ionicons name="link-outline" size={16} color={COLORS.azmitaRed} />
                                    <Text style={styles.hashLabel}>{t('hash_detected')}</Text>
                                </View>
                                <Text style={styles.hashValue}>{extractedHash}</Text>
                                <NeonButton
                                    title={t('subscan_view')}
                                    onPress={handleOpenSubscan}
                                    style={styles.subscanBtn}
                                />
                            </View>
                        )}

                        <View style={styles.footerActions}>
                            <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
                                <Ionicons name="bookmark-outline" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.actionText}>{t('save_record')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setTagData(null)} style={styles.actionBtn}>
                                <Ionicons name="refresh-outline" size={20} color={COLORS.azmitaRed} />
                                <Text style={[styles.actionText, { color: COLORS.azmitaRed }]}>{t('scan_tag')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        color: COLORS.azmitaRed,
        fontSize: 30,
        marginRight: 20,
        fontWeight: '300',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    scanBtn: {
        marginHorizontal: 20,
        marginBottom: 30,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    fullScroll: {
        paddingHorizontal: 0,
    },
    resultsContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    uidCard: {
        padding: 25,
        marginBottom: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(230, 57, 70, 0.3)',
    },
    section: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230, 57, 70, 0.1)',
        paddingBottom: 10,
    },
    detailSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 2,
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    label: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 2,
        marginBottom: 10,
    },
    value: {
        fontSize: 26,
        fontFamily: 'Inter_700Bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    techList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    techBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    techText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
    },
    ndefContainer: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    ndefText: {
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#FFFFFF',
        lineHeight: 22,
    },
    hashSection: {
        padding: 20,
        backgroundColor: 'rgba(230, 57, 70, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
        marginBottom: 30,
    },
    hashHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        justifyContent: 'center',
    },
    hashLabel: {
        fontSize: 9,
        fontFamily: 'Orbitron_900Black',
        color: COLORS.azmitaRed,
    },
    hashValue: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'monospace',
    },
    subscanBtn: {
        height: 50,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
    },
    actionText: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    }
});

export default NfcInspectorScreen;
