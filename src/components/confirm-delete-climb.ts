import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import { deleteClimb } from '@/db/climbs';
import { deleteClimbPhotoFiles } from '@/db/photos';

/** Asks before deleting a climb and its photos. `onDeleted` runs only after the user confirms. */
export function confirmDeleteClimb(
  db: SQLiteDatabase,
  climbId: string,
  { onDeleted, onCancel }: { onDeleted?: () => void; onCancel?: () => void } = {},
) {
  Alert.alert(
    'Delete this climb?',
    'Its details and photos will be removed from this phone.',
    [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteClimb(db, climbId);
          deleteClimbPhotoFiles(climbId);
          onDeleted?.();
        },
      },
    ],
    // Android dismisses on outside tap; treat that as cancel.
    { cancelable: true, onDismiss: onCancel },
  );
}
