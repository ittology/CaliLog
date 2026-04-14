import { loadData } from '../utils/storage';
import { GoogleDriveService } from './googleDrive';
import { useProfileStore } from '../stores/useProfileStore';
import { usePlanStore } from '../stores/usePlanStore';

// handles the timing and logic for cloud backups automatically.
// uses debouncing to avoid spamming the api.
class Orchestrator {
  private backupTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 3000;
  private initialized = false;

  // hooks up event listeners to stores to trigger backups automatically.
  public initialize() {
    if (this.initialized) return;
    this.initialized = true;

    useProfileStore.subscribe((state, prevState) => {
      // trigger if substantial data changes
      if (state.profile !== prevState.profile || state.history !== prevState.history || state.chatHistory !== prevState.chatHistory) {
        this.trigger();
      }
    });

    usePlanStore.subscribe((state, prevState) => {
      if (state.plans !== prevState.plans) {
        this.trigger();
      }
    });
  }

  // schedule a cloud backup (private now since it auto-triggers)
  private async trigger() {
    try {
      const { profile } = await loadData();

      const canBackup = 
        profile.backupSettings?.autoBackupEnabled && 
        profile.backupSettings?.googleDriveConnected;

      if (!canBackup) return;

      this.clearPending();

      this.backupTimeout = setTimeout(() => this.runBackup(), this.DEBOUNCE_MS) as any;
    } catch (error) {
      console.error('backup orchestrator: failed to schedule backup', error);
    }
  }

  // cancel any backup that hasn't started yet
  public clearPending() {
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
      this.backupTimeout = null;
    }
  }

  private async runBackup() {
    try {
      const freshData = await loadData();
      const { profile } = freshData;
      
      const result = await GoogleDriveService.uploadBackup(
        freshData, 
        profile.backupSettings?.driveFileId
      );

      if (result.success && result.date && result.id) {
        // directly update the store state without circular inline imports
        await useProfileStore.getState().updateBackupStatus(result.date, result.id);
      } else if (!result.success) {
        console.warn('backup orchestrator: automated cloud backup failed:', result.error);
      }
    } catch (error) {
      console.error('backup orchestrator: error during automated backup:', error);
    } finally {
      this.backupTimeout = null;
    }
  }
}

export const BackupOrchestrator = new Orchestrator();
