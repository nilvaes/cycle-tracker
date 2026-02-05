import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';

export default function ModalScreen() {
  const { language } = useLanguage();
  return (
    <ThemedView key={`modal-${language}`} style={styles.container}>
      <ThemedText type="title">{t('modal.title')}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">{t('modal.link')}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
