import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';

const AssetDetailScreen = ({ route, navigation }: any) => {
    const { asset } = route.params;
    const { t } = useTranslation();

    // Mock timeline data
    const timeline = [
        { date: asset.timestamp, event: 'Azmitización (Génesis)', status: 'Success' },
        { date: asset.timestamp - 86400000, event: 'Grabación de Chip en Fábrica', status: 'Verified' },
        { date: Date.now(), event: 'Verificación de Autenticidad', status: 'Valid' }
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← {t('back') || 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t(`category_${asset.category.toLowerCase()}`)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>ID AZMIT</Text>
                <Text style={styles.value}>{asset.id}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>CHIP UID</Text>
                <Text style={styles.value}>{asset.uid}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>TRANSACTION HASH</Text>
                <Text style={styles.txHash}>{asset.txHash}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('timeline') || 'Timeline de Autenticidad'}</Text>

            <View style={styles.timelineContainer}>
                {timeline.map((item, index) => (
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineDotContainer}>
                            <View style={[styles.dot, index === 0 && styles.activeDot]} />
                            {index !== timeline.length - 1 && <View style={styles.line} />}
                        </View>
                        <View style={styles.timelineContent}>
                            <Text style={styles.eventText}>{item.event}</Text>
                            <Text style={styles.dateText}>{new Date(item.date).toLocaleString()}</Text>
                            <Text style={styles.statusBadge}>{item.status}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.deepBlack,
        padding: 20,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        color: COLORS.azmitaBlue,
        fontSize: 16,
        marginRight: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.ghostWhite,
    },
    section: {
        backgroundColor: COLORS.spaceGray,
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.azmitaBlue + '22',
    },
    label: {
        color: COLORS.steel,
        fontSize: 12,
        marginBottom: 5,
    },
    value: {
        color: COLORS.ghostWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    txHash: {
        color: COLORS.azmitaBlue,
        fontSize: 12,
        fontFamily: 'monospace',
    },
    sectionTitle: {
        color: COLORS.ghostWhite,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 20,
    },
    timelineContainer: {
        paddingLeft: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 25,
    },
    timelineDotContainer: {
        alignItems: 'center',
        marginRight: 15,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.steel,
        zIndex: 1,
    },
    activeDot: {
        backgroundColor: COLORS.azmitaBlue,
        shadowColor: COLORS.azmitaBlue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.steel + '44',
        position: 'absolute',
        top: 12,
    },
    timelineContent: {
        flex: 1,
    },
    eventText: {
        color: COLORS.ghostWhite,
        fontSize: 16,
        fontWeight: '600',
    },
    dateText: {
        color: COLORS.steel,
        fontSize: 12,
        marginTop: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.azmitaBlue + '22',
        color: COLORS.azmitaBlue,
        fontSize: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 8,
        fontWeight: 'bold',
    }
});

export default AssetDetailScreen;
