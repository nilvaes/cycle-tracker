import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createNote, getNoteById, updateNote } from '@/lib/notes';
import { emitDataChanged } from '@/lib/events';

export default function NoteScreen() {
  const { editId, date } = useLocalSearchParams<{ editId?: string; date?: string }>();
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(false);

  const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatIsoDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) setLogDate(selected);
  };

  const parseIso = (iso: string) => {
    const [year, month, day] = iso.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (editId && !loadedEdit) {
      getNoteById(Number(editId)).then((note) => {
        if (note) {
          const parsed = parseIso(note.logDate);
          if (parsed) setLogDate(parsed);
          setText(note.text);
        }
        setLoadedEdit(true);
      });
      return;
    }
    if (!editId && date) {
      const parsed = parseIso(date);
      if (parsed) setLogDate(parsed);
    }
  }, [editId, loadedEdit, date]);

  const handleSave = async () => {
    if (!text.trim()) {
      Alert.alert('Note is empty', 'Please write something first.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateNote({ id: Number(editId), logDate: formatIsoDate(logDate), text: text.trim() });
      } else {
        await createNote({ logDate: formatIsoDate(logDate), text: text.trim() });
      }
      emitDataChanged();
      Alert.alert('Saved', editId ? 'Your note was updated.' : 'Your note has been logged.');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8">
        <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">
          {editId ? 'Edit note' : 'Add note'}
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Save a quick daily note.
        </Text>

        <View className="mt-6 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">Log date</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text className="mt-2 text-lg text-foreground dark:text-foreground-dark">
              {formatDisplayDate(logDate)}
            </Text>
          </Pressable>
        </View>
        {showDatePicker ? (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
          />
        ) : null}

        <View className="mt-4 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">Note</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write something about today..."
            placeholderTextColor="#5B5B5B"
            className="mt-2 text-base text-foreground dark:text-foreground-dark"
            multiline
          />
        </View>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            className="rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            className="rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleSave}
            disabled={saving}>
            <Text className="text-sm font-semibold text-primary">
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
