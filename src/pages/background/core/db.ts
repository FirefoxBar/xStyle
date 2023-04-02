import { getGlobal } from '@/share/core/utils';

export function getDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbOpenRequest = getGlobal().indexedDB.open('xstyle', 4);
    dbOpenRequest.onsuccess = (e) => {
      // @ts-ignore
      resolve(e.target.result);
    };
    dbOpenRequest.onerror = (e) => {
      console.error(e);
      reject(e);
    };
    dbOpenRequest.onupgradeneeded = (event) => {
      const db: IDBDatabase = (event.target as any).result;
      if (event.oldVersion == 0) {
        // Installed
        db.createObjectStore('styles', {
          keyPath: 'id',
          autoIncrement: true,
        });
      } else {
        const tx: IDBTransaction = (event.target as any).transaction;
        const os = tx.objectStore('styles');
        os.openCursor().onsuccess = function (e) {
          const cursor: IDBCursorWithValue = (e.target as any).result;
          if (cursor) {
            const s = cursor.value;
            s.id = cursor.key;
            // upgrade rule format
            // os.put(utils.updateStyleFormat(s));
            cursor.continue();
          }
        };
      }
    };
  });
}
