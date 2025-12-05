/**
 * Export Data Screen - GDPR Compliance
 * Allows users to download all their personal data
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Download, 
  FileJson, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Car,
  User,
  Bell,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { dataExportService } from '@/src/services/dataExportService';
import Toast from 'react-native-toast-message';

export default function ExportDataScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoadingSummary(true);
    const summaryText = await dataExportService.generateSummary();
    setSummary(summaryText);
    setLoadingSummary(false);
  };

  const handleExport = async () => {
    setLoading(true);
    haptic.medium();

    try {
      const success = await dataExportService.exportAndShare();
      
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Export Ready',
          text2: 'Your data has been exported successfully.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Export Failed',
          text2: 'Unable to export your data. Please try again.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'An error occurred while exporting.',
      });
    }

    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Export Your Data</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.brandSubtle, borderColor: colors.brand }]}>
            <Shield size={24} color={colors.brand} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Your Data, Your Rights</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Under GDPR and privacy regulations, you have the right to access and download all personal data we store about you.
              </Text>
            </View>
          </View>

          {/* What's Included */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What's Included</Text>
          
          <View style={[styles.includeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.includeItem}>
              <View style={[styles.includeIcon, { backgroundColor: colors.brandSubtle }]}>
                <User size={18} color={colors.brand} />
              </View>
              <View style={styles.includeInfo}>
                <Text style={[styles.includeLabel, { color: colors.text }]}>Account Information</Text>
                <Text style={[styles.includeDesc, { color: colors.textTertiary }]}>Email, account creation date</Text>
              </View>
              <CheckCircle size={18} color={colors.positive} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.includeItem}>
              <View style={[styles.includeIcon, { backgroundColor: colors.brandSubtle }]}>
                <Car size={18} color={colors.brand} />
              </View>
              <View style={styles.includeInfo}>
                <Text style={[styles.includeLabel, { color: colors.text }]}>Vehicle Data</Text>
                <Text style={[styles.includeDesc, { color: colors.textTertiary }]}>All vehicles, valuations, finance details</Text>
              </View>
              <CheckCircle size={18} color={colors.positive} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.includeItem}>
              <View style={[styles.includeIcon, { backgroundColor: colors.brandSubtle }]}>
                <Bell size={18} color={colors.brand} />
              </View>
              <View style={styles.includeInfo}>
                <Text style={[styles.includeLabel, { color: colors.text }]}>Preferences</Text>
                <Text style={[styles.includeDesc, { color: colors.textTertiary }]}>Notification settings, theme</Text>
              </View>
              <CheckCircle size={18} color={colors.positive} />
            </View>
          </View>

          {/* Data Preview */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Preview</Text>
          
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loadingSummary ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                {summary}
              </Text>
            )}
          </View>

          {/* Export Format */}
          <View style={[styles.formatCard, { backgroundColor: colors.backgroundTertiary }]}>
            <FileJson size={20} color={colors.textTertiary} />
            <Text style={[styles.formatText, { color: colors.textSecondary }]}>
              Export format: JSON (machine-readable)
            </Text>
          </View>

          {/* Export Button */}
          <Pressable 
            onPress={handleExport} 
            disabled={loading}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && { opacity: 0.9 },
              loading && { opacity: 0.7 },
            ]}
          >
            <LinearGradient
              colors={colors.gradientBrand}
              style={styles.exportButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Download size={20} color="white" />
                  <Text style={styles.exportButtonText}>Download My Data</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Privacy Note */}
          <View style={[styles.noteCard, { backgroundColor: colors.warningBg }]}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.noteText, { color: colors.text }]}>
              Your exported file contains sensitive information. Keep it secure and don't share it publicly.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base },
  
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },

  includeCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  includeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includeInfo: { flex: 1 },
  includeLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  includeDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },

  previewCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 150,
  },
  previewText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },

  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xl,
  },
  formatText: {
    fontSize: 14,
  },

  exportButton: {
    marginBottom: Spacing.lg,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.sm,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
