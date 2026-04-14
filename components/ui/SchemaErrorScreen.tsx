import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Button } from './Button';
import { useProfileStore } from '../../stores/useProfileStore';

export function SchemaErrorScreen() {
  const corruptedData = useProfileStore((s) => s.corruptedData);
  const importData = useProfileStore((s) => s.importData);

  const handleExportOldData = async () => {
    try {
      if (!corruptedData) {
        Alert.alert('No Data', 'There is no local data to export.');
        return;
      }
      const filename = `CaliLog_Legacy_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const file = new File(Paths.document, filename);
      file.write(JSON.stringify(corruptedData, null, 2));
      await Sharing.shareAsync(file.uri, { dialogTitle: 'Export Legacy Data' });
    } catch (e) {
      Alert.alert('Export Failed', String(e));
    }
  };

  const handleImportMigratedData = async () => {
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

        // basic validation
        if (importedData.schemaVersion !== 1) {
          throw new Error(`File is version ${importedData.schemaVersion}. Version 1 expected.`);
        }

        Alert.alert(
          'Confirm Import',
          'This will replace your current (unsupported) data with the selected file. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Import',
              style: 'destructive',
              onPress: async () => {
                await importData(importedData);
                Alert.alert('Success', 'Data imported successfully!');
              }
            }
          ]
        );
      }
    } catch (e) {
      Alert.alert('Import Failed', String(e));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}></Text>
        <Text style={styles.title}>Data Version Mismatch</Text>
        <Text style={styles.description}>
          The data found on this device is from a different version of CaliLog and cannot be loaded directly.
        </Text>
        <Text style={styles.instructions}>
          To continue, please export your old data, migrate it to the current schema, and import it here. Or start over with a fresh installation.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Export Current (Old) Data"
            variant="secondary"
            onPress={handleExportOldData}
            fullWidth
          />
          <Button
            label="Import Migrated (V1) Data"
            variant="primary"
            onPress={handleImportMigratedData}
            fullWidth
          />
          
          <View style={styles.divider} />
          
          <Button
            label="Wipe All & Start Fresh"
            variant="danger"
            onPress={() => {
              Alert.alert(
                'WIPE ALL DATA',
                'This will permanently delete all your workouts and settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Wipe Everything', 
                    style: 'destructive', 
                    onPress: async () => {
                      const clear = require('../../utils/storage').clearAllData;
                      await clear();
                      // reload app state
                      useProfileStore.getState().load();
                    }
                  }
                ]
              );
            }}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructions: {
    color: Colors.textDisabled,
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
