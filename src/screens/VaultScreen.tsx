import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
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
            style={styles.card}
            onPress={() => navigation.navigate('AssetDetail', { asset: item })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.category}>{t(`category_${item.category.toLowerCase()}`)}</Text>
                <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.azmitId}>{item.id}</Text>
            <View style={styles.statusBadge}>
                <View style={styles.dot} />
                <Text style={styles.statusText}>{t('azmitado')}</Text>
            </View>
            <Text style={styles.txHash}>{item.txHash.substring(0, 20)}...</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('vault')}</Text>
            <FlatList
                data={azmits}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No assets found in your vault.</Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.deepBlack,
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.azmitaBlue,
        marginBottom: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.spaceGray,
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.azmitaBlue + '22',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    category: {
        color: COLORS.azmitaBlue,
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    date: {
        color: COLORS.steel,
        fontSize: 12,
    },
    azmitId: {
        color: COLORS.ghostWhite,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success + '22',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
        marginRight: 8,
    },
    statusText: {
        color: COLORS.success,
        fontSize: 12,
        fontWeight: '600',
    },
    txHash: {
        color: COLORS.steel,
        fontSize: 10,
        fontFamily: 'monospace',
    },
    emptyText: {
        color: COLORS.steel,
        textAlign: 'center',
        marginTop: 50,
    }
});

export default VaultScreen;
