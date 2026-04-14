import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppData } from '../types';

// google drive backup service using the react-native-google-signin library.
// requires a webclientid from the google cloud console.

export const GoogleDriveService = {
  // setup google sign-in: call this before anything else
  configure: (webClientId: string) => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      webClientId,
      offlineAccess: true,
    });
  },

  // open the google sign-in picker
  signIn: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success') {
        return response.data;
      }
      throw new Error('sign-in cancelled or failed');
    } catch (error) {
      console.error('google sign-in error:', error);
      throw error;
    }
  },

  // check if we're already logged in
  isSignedIn: async () => {
    return GoogleSignin.hasPreviousSignIn();
  },

  // log out of google
  signOut: async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('google sign-out error:', error);
    }
  },

  // upload app data to drive. if no file id exists, it searches for an existing backup first.
  uploadBackup: async (data: AppData, existingFileId?: string) => {
    try {
      const silentRes = await GoogleSignin.signInSilently();

      if (silentRes.type !== 'success') {
        console.warn('silent sign-in failed, backup aborted');
        return { success: false, error: 'not signed in' };
      }

      const { accessToken } = await GoogleSignin.getTokens();
      if (!accessToken) {
        throw new Error('could not retrieve access token');
      }

      const filename = 'calilog_backup.json';
      let fileId = existingFileId;

      // search for the backup file if we don't have a stored id yet
      if (!fileId) {
        const query = encodeURIComponent(`name = '${filename}' and trashed = false`);
        const listResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (listResponse.ok) {
          const listData = await listResponse.json();
          const foundFile = listData.files && listData.files[0];
          if (foundFile) {
            fileId = foundFile.id;
          }
        }
      }

      // prep the multipart request body with metadata and content
      const metadata = {
        name: filename,
        mimeType: 'application/json',
      };

      const content = JSON.stringify(data, null, 2);
      const boundary = 'foo_bar_baz';
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`upload failed: ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id || fileId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      console.error('backup upload failed:', error);
      return { success: false, error: String(error) };
    }
  },
};
