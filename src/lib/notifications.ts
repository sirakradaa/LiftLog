import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL = 'rest-timer';
let ready = false;
let mod: NotificationsModule | null | undefined;

// expo-notifications throws on import in Expo Go on Android, so it must not be imported statically.
function load(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  const expoGoAndroid =
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  try {
    mod = expoGoAndroid ? null : require('expo-notifications');
  } catch (e) {
    console.warn('Notifications unavailable', e);
    mod = null;
  }
  return mod ?? null;
}

export async function initNotifications() {
  const Notifications = load();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
        sound: 'default',
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    ready = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    console.warn('Notifications unavailable', e);
    ready = false;
  }
}

export async function scheduleRestDone(seconds: number): Promise<string | null> {
  const Notifications = load();
  if (!Notifications || !ready || seconds <= 0) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest complete', body: 'Time for your next set.', sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule rest notification', e);
    return null;
  }
}

export async function cancelNotification(id: string | null) {
  const Notifications = load();
  if (!id || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or unavailable
  }
}
