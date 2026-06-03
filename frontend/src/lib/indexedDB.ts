import { ChannelMessage } from '../types';

const DB_NAME = 'AeroMeetDB';
const DB_VERSION = 1;

export interface OfflineQueuedMessage {
  id: string; // temp- timestamp
  teamId: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl: string | null;
  createdAt: string;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser context'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('channel_messages')) {
        db.createObjectStore('channel_messages', { keyPath: 'channelId' });
      }
      if (!db.objectStoreNames.contains('offline_messages_queue')) {
        db.createObjectStore('offline_messages_queue', { keyPath: 'id' });
      }
    };
  });
}

// 1. Cache standard channel messages (stores latest 50 messages)
export async function cacheMessages(channelId: string, messages: ChannelMessage[]): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction('channel_messages', 'readwrite');
    const store = transaction.objectStore('channel_messages');

    // Keep only the latest 50 messages
    const latestMessages = messages.slice(-50);

    store.put({
      channelId,
      messages: latestMessages,
      cachedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to cache messages in IndexedDB:', err);
  }
}

// 2. Fetch cached channel messages from IndexedDB
export async function getCachedMessages(channelId: string): Promise<ChannelMessage[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('channel_messages', 'readonly');
      const store = transaction.objectStore('channel_messages');
      const request = store.get(channelId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result && request.result.messages) {
          resolve(request.result.messages);
        } else {
          resolve([]);
        }
      };
    });
  } catch (err) {
    console.error('❌ Failed to get cached messages from IndexedDB:', err);
    return [];
  }
}

// 3. Add unsent message to offline auto-retry queue
export async function queueOfflineMessage(msg: OfflineQueuedMessage): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction('offline_messages_queue', 'readwrite');
    const store = transaction.objectStore('offline_messages_queue');
    store.put(msg);
  } catch (err) {
    console.error('❌ Failed to queue offline message in IndexedDB:', err);
  }
}

// 4. Retrieve list of all offline queued messages
export async function getOfflineQueue(): Promise<OfflineQueuedMessage[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_messages_queue', 'readonly');
      const store = transaction.objectStore('offline_messages_queue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error('❌ Failed to fetch offline queue from IndexedDB:', err);
    return [];
  }
}

// 5. Remove message from offline queue after successful server sync
export async function clearOfflineQueueItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction('offline_messages_queue', 'readwrite');
    const store = transaction.objectStore('offline_messages_queue');
    store.delete(id);
  } catch (err) {
    console.error('❌ Failed to delete item from offline queue in IndexedDB:', err);
  }
}
