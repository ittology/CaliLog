import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useProfileStore } from '../../stores/useProfileStore';
import { usePlanStore } from '../../stores/usePlanStore';
import { loadData, saveData } from '../../utils/storage';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/helpers';
import { GoogleDriveService } from '../../services/googleDrive';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const addBodyWeight = useProfileStore((s) => s.addBodyWeight);
  const removeBodyWeight = useProfileStore((s) => s.removeBodyWeight);
  const importData = useProfileStore((s) => s.importData);
  const loadPlans = usePlanStore((s) => s.load);

  const [weightInput, setWeightInput] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lb'>('kg');

  const handleAddWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid weight', 'Please enter a positive number.');
      return;
    }
    addBodyWeight(val, selectedUnit);
    setWeightInput('');
  };

  const handleDeleteWeight = (id: string) => {
    Alert.alert('Remove Entry', 'Remove this body weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBodyWeight(id) },
    ]);
  };

  const handleConnectGoogle = async () => {
    try {
      if (!profile.backupSettings.webClientId) {
        Alert.alert('Configuration Missing', 'Please enter your Google Web Client ID first.');
        return;
      }
      GoogleDriveService.configure(profile.backupSettings.webClientId);
      await GoogleDriveService.signIn();
      await updateProfile({
        backupSettings: { ...profile.backupSettings, googleDriveConnected: true },
      });
      Alert.alert('Success', 'Google Drive connected!');
    } catch (e) {
      Alert.alert('Connection Failed', String(e));
    }
  };

  const handleDisconnectGoogle = async () => {
    await GoogleDriveService.signOut();
    await updateProfile({
      backupSettings: { ...profile.backupSettings, googleDriveConnected: false, autoBackupEnabled: false },
    });
    Alert.alert('Disconnected', 'Google Drive account disconnected.');
  };

  const handleManualBackup = async () => {
    try {
      if (!profile.backupSettings.googleDriveConnected) {
        Alert.alert('Not Connected', 'Please connect Google Drive first.');
        return;
      }
      const data = await loadData();
      const result = await GoogleDriveService.uploadBackup(data, profile.backupSettings.driveFileId);
      if (result.success && result.date && result.id) {
        await useProfileStore.getState().updateBackupStatus(result.date, result.id);
        Alert.alert('Success', 'Backup uploaded successfully!');
      } else {
        throw new Error(result.error || 'Backup failed');
      }
    } catch (e) {
      Alert.alert('Backup Failed', String(e));
    }
  };

  const recentWeights = profile.bodyWeightLog.slice(0, 10);
  const latestWeight = profile.bodyWeightLog[0];

  const handleExport = async (type: 'plans' | 'history' | 'full') => {
    try {
      const data = await loadData();
      let exportData;
      let title = '';
      
      if (type === 'plans') {
        exportData = data.plans;
        title = 'CaliLog_Plans';
      } else if (type === 'history') {
        exportData = data.history;
        title = 'CaliLog_History';
      } else {
        exportData = data;
        title = 'CaliLog_Full_Backup';
      }

      const filename = `${title}_${new Date().toISOString().split('T')[0]}.json`;
      const file = new File(Paths.document, filename);
      file.write(JSON.stringify(exportData, null, 2));
      await Sharing.shareAsync(file.uri, { dialogTitle: 'Export Data' });
    } catch (e) {
      Alert.alert('Export Failed', String(e));
    }
  };

  const handleImport = async (type: 'plans' | 'history' | 'full') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const raw = await new File(fileUri).text();

        let importedData;
        try {
          importedData = JSON.parse(raw);
        } catch {
          throw new Error('File is not valid JSON.');
        }

        const currentData = await loadData();
        let promptMessage = '';
        let confirmAction = async () => {};

        if (type === 'full') {
          if (!importedData || !importedData.history) throw new Error('Invalid backup file. Missing history.');
          promptMessage = `This will overwrite EVERYTHING and load ${importedData.history.length || 0} sessions.\n\nAre you sure?`;
          // use importData so the store state updates immediately — no restart needed
          confirmAction = async () => await importData(importedData);
        } else if (type === 'plans') {
          if (!Array.isArray(importedData)) throw new Error('Invalid format. Expected an array of plans.');
          promptMessage = `This will add ${importedData.length} plan(s) to your existing plans. Continue?`;
          confirmAction = async () => {
            const merged = [...importedData, ...currentData.plans];
            currentData.plans = merged;
            await saveData(currentData);
            // reload the plan store so the UI reflects the new plans immediately
            await loadPlans();
          };
        } else if (type === 'history') {
          if (!Array.isArray(importedData)) throw new Error('Invalid format. Expected an array of history logs.');
          promptMessage = `This will add ${importedData.length} session(s) to your history. Continue?`;
          confirmAction = async () => {
            const merged = [...importedData, ...currentData.history].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            currentData.history = merged;
            await saveData(currentData);
            // reload profile store so history is live without restart
            await useProfileStore.getState().load();
          };
        }

        Alert.alert(
          'Confirm Import',
          promptMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Import',
              style: 'destructive',
              onPress: async () => {
                await confirmAction();
                Alert.alert('Success', 'Import complete.');
              },
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Import Failed', String(e));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Profile & Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* body weight section */}
        <Text style={styles.sectionTitle}>Body Weight</Text>
        {latestWeight && (
          <View style={styles.currentWeight}>
            <Text style={styles.currentWeightValue}>
              {latestWeight.weight}
              <Text style={styles.currentWeightUnit}> {latestWeight.unit}</Text>
            </Text>
            <Text style={styles.currentWeightDate}>
              as of {formatDate(latestWeight.date)}
            </Text>
          </View>
        )}

        <View style={styles.weightLoggingControls}>
          <View style={styles.unitToggleRow}>
            <TouchableOpacity
              style={[styles.miniUnitBtn, selectedUnit === 'kg' && styles.miniUnitBtnActive]}
              onPress={() => setSelectedUnit('kg')}
            >
              <Text style={[styles.miniUnitBtnText, selectedUnit === 'kg' && styles.miniUnitBtnTextActive]}>kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.miniUnitBtn, selectedUnit === 'lb' && styles.miniUnitBtnActive]}
              onPress={() => setSelectedUnit('lb')}
            >
              <Text style={[styles.miniUnitBtnText, selectedUnit === 'lb' && styles.miniUnitBtnTextActive]}>lb</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addWeightRow}>
            <TextInput
              style={styles.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={`Enter…`}
              placeholderTextColor={Colors.textDisabled}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddWeight}
            />
            <Button
              label="Log"
              variant="primary"
              onPress={handleAddWeight}
              disabled={!weightInput.trim()}
            />
          </View>
        </View>

        {recentWeights.length > 0 && (
          <View style={styles.weightLog}>
            {recentWeights.map((entry) => (
              <View key={entry.id} style={styles.weightEntry}>
                <View style={styles.weightEntryLeft}>
                  <Text style={styles.weightEntryValue}>
                    {entry.weight} {entry.unit}
                  </Text>
                  <Text style={styles.weightEntryDate}>{formatDate(entry.date)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteWeight(entry.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.weightEntryDelete}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* settings section */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Settings</Text>

        {/* units */}

        {/* streak target */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Streak Target</Text>
            <Text style={styles.settingDesc}>
              Consecutive sessions before a quality check
            </Text>
          </View>
          <View style={styles.streakPicker}>
            {[2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.streakBtn,
                  profile.streakTarget === n && styles.streakBtnActive,
                ]}
                onPress={() => updateProfile({ streakTarget: n })}
              >
                <Text
                  style={[
                    styles.streakBtnText,
                    profile.streakTarget === n && styles.streakBtnTextActive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* google drive cloud backup */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Cloud Backup</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Google Web Client ID</Text>
            <TextInput
              style={styles.textInput}
              value={profile.backupSettings.webClientId || ''}
              onChangeText={(val) => updateProfile({ backupSettings: { ...profile.backupSettings, webClientId: val } })}
              placeholder="000000000000-xxx.apps.googleusercontent.com"
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputDesc}>Found in Google Cloud Console / Firebase</Text>
          </View>

          {profile.backupSettings.googleDriveConnected ? (
            <View style={{ gap: Spacing.sm }}>
              <View style={styles.statusRow}>
                <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
                <Text style={styles.statusText}>Connected to Google Drive</Text>
              </View>
              <View style={styles.settingInnerRow}>
                 <Text style={styles.settingLabel}>Auto Backup</Text>
                 <TouchableOpacity 
                    style={[styles.miniUnitBtn, profile.backupSettings.autoBackupEnabled && styles.miniUnitBtnActive]}
                    onPress={() => updateProfile({ backupSettings: { ...profile.backupSettings, autoBackupEnabled: !profile.backupSettings.autoBackupEnabled } })}
                 >
                    <Text style={[styles.miniUnitBtnText, profile.backupSettings.autoBackupEnabled && styles.miniUnitBtnTextActive]}>
                        {profile.backupSettings.autoBackupEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                 </TouchableOpacity>
              </View>
              {profile.backupSettings.lastBackupDate && (
                <Text style={styles.inputDesc}>Last backup: {formatDate(profile.backupSettings.lastBackupDate)}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                <Button label="Backup Now" variant="primary" onPress={handleManualBackup} style={{ flex: 1 }} />
                <Button label="Disconnect" variant="danger" onPress={handleDisconnectGoogle} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <Button label="Connect Google Drive" variant="primary" onPress={handleConnectGoogle} />
          )}
        </View>

        {/* ai assistant integration */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Assistant</Text>
        <View style={styles.card}>
          <Text style={styles.inputDesc}>Configure models per API provider. The assistant uses the key associated with your selected model.</Text>

          {profile.aiSettings.providers.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <Text style={styles.providerName}>{provider.name}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>API Key</Text>
                <TextInput
                  style={styles.textInput}
                  value={provider.apiKey}
                  onChangeText={(val) => {
                    const next = profile.aiSettings.providers.map(p => p.id === provider.id ? { ...p, apiKey: val } : p);
                    updateProfile({ aiSettings: { ...profile.aiSettings, providers: next } });
                  }}
                  placeholder="Paste key…"
                  placeholderTextColor={Colors.textDisabled}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Models (Comma separated)</Text>
                <TextInput
                  style={styles.textInput}
                  value={provider.models.join(', ')}
                  onChangeText={(val) => {
                    const models = val.split(',').map(m => m.trim()).filter(Boolean);
                    const next = profile.aiSettings.providers.map(p => p.id === provider.id ? { ...p, models } : p);
                    updateProfile({ aiSettings: { ...profile.aiSettings, providers: next } });
                  }}
                  placeholder="gemini-1.5-flash, etc"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </View>
          ))}
          
          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Personal Context (Bio, Goals, Limitations)</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100, paddingTop: 12, paddingBottom: 12 }]}
              value={profile.aiSettings.personalContext || ''}
              onChangeText={(val) => updateProfile({ aiSettings: { ...profile.aiSettings, personalContext: val } })}
              placeholder="e.g. I am 25 years old, 180cm, 80kg. My goal is the Planche. I have a slight wrist injury..."
              placeholderTextColor={Colors.textDisabled}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.inputDesc}>This info is sent to the AI to personalize its responses.</Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.subSectionTitle}>Context Limits</Text>
          <Text style={styles.inputDesc}>Max items sent to the AI per request (newest to oldest).</Text>

          <View style={styles.limitControlGroup}>
             <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Workout Logs</Text>
                <View style={styles.numberAdjust}>
                  {[5, 10, 15, 20].map(n => (
                    <TouchableOpacity 
                      key={n} 
                      style={[styles.numBtn, profile.aiSettings.logContextLimit === n && styles.numBtnActive]}
                      onPress={() => updateProfile({ aiSettings: { ...profile.aiSettings, logContextLimit: n } })}
                    >
                      <Text style={[styles.numBtnText, profile.aiSettings.logContextLimit === n && styles.numBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>

             <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Workout Plans</Text>
                <View style={styles.numberAdjust}>
                  {[3, 5, 8, 10].map(n => (
                    <TouchableOpacity 
                      key={n} 
                      style={[styles.numBtn, profile.aiSettings.planContextLimit === n && styles.numBtnActive]}
                      onPress={() => updateProfile({ aiSettings: { ...profile.aiSettings, planContextLimit: n } })}
                    >
                      <Text style={[styles.numBtnText, profile.aiSettings.planContextLimit === n && styles.numBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>

             <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Weight Logs</Text>
                <View style={styles.numberAdjust}>
                  {[20, 50, 100, 200].map(n => (
                    <TouchableOpacity 
                      key={n} 
                      style={[styles.numBtn, profile.aiSettings.weightLogLimit === n && styles.numBtnActive]}
                      onPress={() => updateProfile({ aiSettings: { ...profile.aiSettings, weightLogLimit: n } })}
                    >
                      <Text style={[styles.numBtnText, profile.aiSettings.weightLogLimit === n && styles.numBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>
          </View>
        </View>

        {/* data export and import management */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Export Data</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Button label="Export Plans" variant="secondary" onPress={() => handleExport('plans')} style={{ flex: 1 }} />
          <Button label="Export History" variant="secondary" onPress={() => handleExport('history')} style={{ flex: 1 }} />
        </View>
        <Button label="Export Full Backup" variant="primary" onPress={() => handleExport('full')} style={{ marginTop: Spacing.xs }} />

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Import Data</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Button label="Import Plans" variant="secondary" onPress={() => handleImport('plans')} style={{ flex: 1 }} />
          <Button label="Import History" variant="secondary" onPress={() => handleImport('history')} style={{ flex: 1 }} />
        </View>
        <Button label="Import Full Backup" variant="danger" onPress={() => handleImport('full')} style={{ marginTop: Spacing.xs }} />

        {/* about the app */}
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>CaliLog v1.0.0</Text>
          <Text style={styles.aboutText}>
            Open-source calisthenics tracker.{'\n'}
            Built with React Native & Expo.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  currentWeight: {
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  currentWeightValue: {
    color: Colors.primary,
    fontSize: Typography.hero,
    fontWeight: Typography.bold,
  },
  currentWeightUnit: {
    fontSize: Typography.xl,
    fontWeight: Typography.regular,
  },
  currentWeightDate: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
  addWeightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    minHeight: MIN_TAP_TARGET,
  },
  weightLog: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  weightEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weightEntryLeft: {
    flex: 1,
    gap: 2,
  },
  weightEntryValue: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  weightEntryDate: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  weightEntryDelete: {
    color: Colors.danger,
    fontSize: 24,
    fontWeight: Typography.bold,
    lineHeight: 28,
  },
  settingRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingLeft: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  settingDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    lineHeight: 16,
  },
  weightLoggingControls: {
    gap: Spacing.sm,
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  miniUnitBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniUnitBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  miniUnitBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  miniUnitBtnTextActive: {
    color: '#0d1117',
  },
  streakPicker: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  streakBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  streakBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  streakBtnTextActive: {
    color: '#0d1117',
  },
  about: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  aboutTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  aboutText: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  subSectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  limitControlGroup: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  limitRow: {
    gap: 8,
  },
  limitLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
  },
  inputLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  textInput: {
    backgroundColor: Colors.surfaceRaised,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  inputDesc: {
    color: Colors.textDisabled,
    fontSize: Typography.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  settingInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberAdjust: {
    flexDirection: 'row',
    gap: 4,
  },
  numBtn: {
    flex: 1,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  numBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  numBtnTextActive: {
    color: Colors.bg,
  },
  providerCard: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerName: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  deleteText: {
    color: Colors.danger,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
});
