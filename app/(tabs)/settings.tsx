import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { listPeriods } from '@/lib/periods';
import { listSymptomLogs } from '@/lib/symptoms';
import { deleteAllData } from '@/lib/db';
import { emitDataChanged } from '@/lib/events';
import { listNotes } from '@/lib/notes';

export default function SettingsScreen() {
  const handleExport = async () => {
    const [periods, symptoms, notes] = await Promise.all([
      listPeriods(),
      listSymptomLogs(),
      listNotes(),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      periods,
      symptoms,
      notes,
    };
    const fileUri = `${FileSystem.documentDirectory}cycle-tracker-export.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Export saved', `File saved to: ${fileUri}`);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete all data?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          emitDataChanged();
          Alert.alert('Deleted', 'All local data has been removed.');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-6 pt-8 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          Settings
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Manage your data and privacy controls.
        </Text>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Data controls
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            Your data is stored locally only.
          </Text>

          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleExport}>
            <Text className="text-sm font-semibold text-primary">Export data</Text>
          </Pressable>

          <Pressable
            className="mt-3 rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleDelete}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              Delete all data
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Privacy
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            No accounts, no tracking, no analytics.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
