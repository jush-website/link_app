import { appId } from '../../src/firebase.js';
export { auth, db } from '../../src/firebase.js';
export const taskPath = uid => ['artifacts', appId, 'users', uid, 'reminders'];

export function authError(error) {
  const messages = {
    'permission-denied': '這個帳號目前無法讀寫提醒，請確認 Firebase 的 reminders 使用者規則。',
    'auth/network-request-failed': '目前無法連線，請確認網路後再試。',
    'auth/account-exists-with-different-credential': '這個帳號已有其他登入方式，請使用原帳號的 Google 登入。',
  };
  return messages[error.code] ?? '操作未完成，請稍後重試。';
}
