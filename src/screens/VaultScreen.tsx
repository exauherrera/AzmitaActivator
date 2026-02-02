import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ScreenWrapper } from '../components/ScreenWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

interface Azmit {
    id: string;
    uid: string;
    category: string;
    timestamp: number;
    txHash: string;
}

const VaultScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const [azmits, setAzmits] = useState<Azmit[]>([]);

    useEffect(() => {
        loadAzmits();
    }, []);

    const loadAzmits = async () => {
        try {
            const stored = await AsyncStorage.getItem('azmit-vault');
            if (stored) {
                setAzmits(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Error loading vault', e);
        }
    };

    const renderItem = ({ item }: { item: Azmit }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AssetDetail', { asset: item })}
        >
            <GlassCard style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.category}>{t(`category_${item.category.toLowerCase()}`)}</Text>
                    <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.azmitId}>{item.id}</Text>
                <View style={styles.statusBadge}>
                    <View style={styles.dot} />
                    <Text style={styles.statusText}>{t('azmitado')}</Text>
                </View>
                <Text style={styles.txHash}>{item.txHash}</Text>
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('vault')}</Text>
            </View>

            <FlatList
                data={azmits}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Vault is empty</Text>
                        <Text style={styles.emptySubtext}>Bind your first physical asset to start.</Text>
                    </View>
                }
            />
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
        color: COLORS.azmitaBlue,
        fontSize: 30,
        marginRight: 20,
        fontWeight: '300',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: 2,
    },
    list: {
        paddingBottom: 40,
    },
    card: {
        padding: 24,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    category: {
        color: COLORS.azmitaBlue,
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    date: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    azmitId: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 30,
        alignSelf: 'flex-start',
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: 'rgba(0, 255, 163, 0.3)',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginRight: 8,
        shadowColor: COLORS.success,
        shadowRadius: 4,
        shadowOpacity: 1,
    },
    statusText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    txHash: {
        color: COLORS.textGhost,
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtext: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 8,
    }
});

export default VaultScreen;
