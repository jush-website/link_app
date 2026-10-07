import { useEffect, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db, taskPath, authError } from './firebase.js';
import { validateTask } from './model.js';

const LOCAL_KEY = 'remember-local-tasks-v1';

export function useTasks() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('正在載入');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const localTasks = useRef([]);
  const localQueue = useRef(Promise.resolve());

  useEffect(() => {
    let unsubscribeTasks = () => {};
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, nextUser => {
      const current = ++generation;
      unsubscribeTasks();
      const account = nextUser && !nextUser.isAnonymous ? nextUser : null;
      setUser(account);
      setTasks([]);
      setError('');
      setReady(false);
      if (account) {
        setStatus('正在同步');
        unsubscribeTasks = onSnapshot(collection(db, ...taskPath(account.uid)), { includeMetadataChanges: true }, snapshot => {
          if (generation !== current) return;
          setTasks(snapshot.docs.map(item => ({ ...item.data(), id: item.id })).filter(item => !item.deleted));
          setStatus(snapshot.metadata.hasPendingWrites ? '已儲存 · 等待同步' : snapshot.metadata.fromCache ? '離線快取 · 等待連線' : '雲端已同步');
          setReady(true);
        }, failure => {
          if (generation !== current) return;
          setError(authError(failure));
          setStatus('同步未完成');
          setReady(false);
        });
      } else {
        setStatus('本機儲存 · 登入後可同步');
        Preferences.get({ key: LOCAL_KEY }).then(({ value }) => {
          if (generation !== current) return;
          const local = value ? JSON.parse(value) : [];
          if (!Array.isArray(local)) throw new Error('資料格式無效');
          localTasks.current = local;
          setTasks(local.filter(item => !item.deleted));
          setReady(true);
        }).catch(() => {
          if (generation !== current) return;
          setError('本機資料無法載入。請保留裝置資料，重新開啟再試。');
        });
      }
    });
    return () => { generation++; unsubscribeAuth(); unsubscribeTasks(); };
  }, []);

  function mutateLocal(updater) {
    const result = localQueue.current.then(async () => {
      const next = updater(localTasks.current);
      await Preferences.set({ key: LOCAL_KEY, value: JSON.stringify(next) });
      localTasks.current = next;
      if (!auth.currentUser || auth.currentUser.isAnonymous) setTasks(next.filter(item => !item.deleted));
    });
    localQueue.current = result.catch(() => {});
    return result;
  }

  async function put(task) {
    if (!ready) throw new Error('資料尚未載入，請稍後重試。');
    validateTask(task);
    const updated = { ...task, updatedAt: Date.now() };
    if (user) {
      // Firestore 先寫離線快取；未連線時保留待同步狀態，避免把它宣稱為已上傳。
      setDoc(doc(db, ...taskPath(user.uid), task.id), updated).catch(failure => setError(authError(failure)));
    } else {
      await mutateLocal(previous => [...previous.filter(item => item.id !== task.id), updated]);
    }
  }

  async function remove(task) {
    if (!ready) throw new Error('資料尚未載入，請稍後重試。');
    if (user) {
      setDoc(doc(db, ...taskPath(user.uid), task.id), { ...task, deleted: true, completed: true, updatedAt: Date.now() }).catch(failure => setError(authError(failure)));
    } else {
      await mutateLocal(previous => previous.filter(item => item.id !== task.id));
    }
  }

  async function importLocal() {
    if (!user || !ready) throw new Error('請先登入並完成資料載入。');
    const { value } = await Preferences.get({ key: LOCAL_KEY });
    const local = value ? JSON.parse(value) : [];
    if (!Array.isArray(local)) throw new Error('本機資料格式無效。');
    let count = 0;
    // 原 ID 加交易檢查：重試匯入不重複、不覆寫完成事項，也不復活已刪除的事項。
    for (const task of local) {
      const reference = doc(db, ...taskPath(user.uid), task.id);
      const inserted = await runTransaction(db, async transaction => {
        if ((await transaction.get(reference)).exists()) return false;
        transaction.set(reference, validateTask(task));
        return true;
      });
      if (inserted) count++;
    }
    return count;
  }

  return { user, tasks, status, error, setError, ready, put, remove, importLocal };
}
