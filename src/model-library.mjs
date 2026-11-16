// IndexedDB keeps the original files on this browser, scoped to this site's path.
let database;
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(`field-models:${location.pathname}`, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('models', {keyPath: 'id'});
      request.result.createObjectStore('state');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {db.close(); database = undefined;};
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Browser storage is busy in another tab.'));
  }).catch(error => {database = undefined; throw error;});
  return database;
}
async function transaction(stores, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = action(tx);
    tx.oncomplete = () => resolve(result());
    tx.onabort = () => reject(tx.error || new Error('Browser storage is unavailable.'));
    tx.onerror = () => {}; // The abort event reports the transaction failure.
  });
}
export function readLibrary() {
  return transaction(['models', 'state'], 'readonly', tx => {
    const records = tx.objectStore('models').getAll();
    const selection = tx.objectStore('state').get('selection');
    return () => ({records: records.result, selection: selection.result});
  });
}
export function saveModel(record) {
  return transaction(['models'], 'readwrite', tx => {
    tx.objectStore('models').put(record);
    return () => {};
  });
}
export function removeModel(id) {
  return transaction(['models'], 'readwrite', tx => {
    tx.objectStore('models').delete(id);
    return () => {};
  });
}
export function saveSelection(id) {
  return transaction(['state'], 'readwrite', tx => {
    tx.objectStore('state').put(id, 'selection');
    return () => {};
  });
}
