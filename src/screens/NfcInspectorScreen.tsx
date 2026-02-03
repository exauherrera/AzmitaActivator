import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Dimensions } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import nfcService from '../services/nfcService';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

const NfcInspectorScreen = () => {
    const [loading, setLoading] = useState(false);
    const [tagData, setTagData] = useState<any>(null);
    const [extractedHash, setExtractedHash] = useState<string | null>(null);

    const handleScan = async () => {
        setLoading(true);
        setTagData(null);
        setExtractedHash(null);
        try {
            const data = await nfcService.readRawTag();
            if (data) {
                setTagData(data);
                // Extract hash logic: looks for 0x... (64 hex chars)
                const hashRegex = /0x[a-fA-F0-9]{64}/;
                const match = data.ndefMessage?.match(hashRegex);
                if (match) {
                    setExtractedHash(match[0]);
                }
            }
        } catch (err) {
            Alert.alert('Error', 'No se pudo leer el tag');
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
            Alert.alert('Éxito', 'Datos guardados localmente');
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar');
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
            <Text style={styles.title}>INSPECTOR</Text>

            <NeonButton
                title={loading ? "LEYENDO..." : "ESCANEAR TAG"}
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
                                <Text style={styles.hashLabel}>BLOCKCHAIN HASH DETECTADO</Text>
                                <Text style={styles.hashValue}>{extractedHash}</Text>
                                <NeonButton
                                    title="VER EN SUBSCAN"
                                    onPress={handleOpenSubscan}
                                    style={styles.subscanBtn}
                                />
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                                <Text style={styles.saveText}>GUARDAR REGISTRO</Text>
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
    }
});

import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
const TouchableOpacity = RNTouchableOpacity;

export default NfcInspectorScreen;
