import { Alert, Platform } from 'react-native';

import { t } from './i18n';

/** Ask before doing something that can't be undone. Works on phones and in the browser. */
export function confirm(title: string, message: string, actionLabel: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: t('Cancel'), style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onYes },
  ]);
}

export function tell(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message, [{ text: t('OK') }]);
}
