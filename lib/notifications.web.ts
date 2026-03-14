/**
 * Web stub so we never load expo-notifications during static export (no localStorage in Node).
 */
export async function getAllScheduledNotificationsAsync() {
  return [];
}

export async function cancelAllScheduledNotificationsAsync() {
  // no-op on web
}
