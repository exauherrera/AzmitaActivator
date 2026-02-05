import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ScreenWrapper } from '../components/ScreenWrapper';

const AssetDetailScreen = ({ route, navigation }: any) => {
    const { asset } = route.params;
    const { t } = useTranslation();

    const timeline = asset.chainOfCustody || [
        { date: asset.timestamp - 172800000, event: 'FACTORY_PROVISIONING', status: 'VERIFIED' },
        { date: asset.timestamp, event: 'PHYGITAL_VINCULATION', status: 'LOCKED' },
        { date: Date.now(), event: 'OWNERSHIP_VERIFIED', status: 'GENUINE' }
    ];

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.category}>{t(`category_${asset.category.toLowerCase()}`)}</Text>
                        <Text style={styles.title}>{asset.id.split('-')[0]}</Text>
                    </View>
                </View>

                <GlassCard style={styles.mainInfo}>
                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>FULL ID</Text>
                            <Text style={styles.value}>{asset.id}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>CHIP UID (DNA)</Text>
                            <Text style={styles.value}>{asset.uid}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>NETWORK PROXY</Text>
                            <Text style={styles.txHash}>{asset.txHash}</Text>
                        </View>
                    </View>
                </GlassCard>

                <Text style={styles.sectionTitle}>CHAIN OF CUSTODY</Text>

                <View style={styles.timelineContainer}>
                    {timeline.map((item: any, index: number) => (
                        <View key={index} style={styles.timelineItem}>
                            <View style={styles.timelineDotContainer}>
                                <View style={[styles.dot, index === 0 && styles.activeDot]} />
                                {index !== timeline.length - 1 && <View style={styles.line} />}
                            </View>
                            <GlassCard style={styles.timelineCard}>
                                <Text style={styles.eventText}>{item.event}</Text>
                                <Text style={styles.dateText}>{new Date(item.date).toLocaleString()}</Text>
                                <View style={[
                                    styles.statusBadge,
                                    { borderColor: item.status === 'LOCKED' ? COLORS.azmitaRed : (item.status === 'VERIFIED' || item.status === 'GENUINE' ? COLORS.success : COLORS.textSecondary) }
                                ]}>
                                    <Text style={[
                                        styles.statusBadgeText,
                                        { color: item.status === 'LOCKED' ? COLORS.azmitaRed : (item.status === 'VERIFIED' || item.status === 'GENUINE' ? COLORS.success : COLORS.textSecondary) }
                                    ]}>{item.status}</Text>
                                </View>
                            </GlassCard>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    backArrow: {
        color: COLORS.azmitaRed,
        fontSize: 24,
    },
    category: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Orbitron_900Black',
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    mainInfo: {
        padding: 24,
        marginBottom: 32,
    },
    infoRow: {
        marginVertical: 4,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 16,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 6,
    },
    value: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },
    txHash: {
        color: COLORS.azmitaRed,
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        lineHeight: 16,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontFamily: 'Orbitron_900Black',
        letterSpacing: 3,
        marginBottom: 24,
        textAlign: 'center',
    },
    timelineContainer: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineDotContainer: {
        alignItems: 'center',
        marginRight: 20,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.textGhost,
        marginTop: 20,
        zIndex: 2,
    },
    activeDot: {
        backgroundColor: COLORS.success,
        shadowColor: COLORS.success,
        shadowRadius: 8,
        shadowOpacity: 1,
        elevation: 10,
    },
    line: {
        width: 1.5,
        flex: 1,
        backgroundColor: COLORS.glassBorder,
        position: 'absolute',
        top: 32,
    },
    timelineCard: {
        flex: 1,
        padding: 16,
    },
    eventText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    dateText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 12,
        borderColor: COLORS.azmitaRed,
    },
    statusBadgeText: {
        fontSize: 9,
        fontFamily: 'Orbitron_900Black',
        letterSpacing: 1,
        color: COLORS.azmitaRed,
    }
});

export default AssetDetailScreen;
