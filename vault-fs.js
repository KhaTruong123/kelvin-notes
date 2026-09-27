// Read/write .md files inside a folder the user picked (File System Access API).
// The folder handle is remembered in IndexedDB so the next visit only needs a one-click re-grant.
(function () {
  const DB_NAME = 'kelvin-notes';
  const STORE = 'handles';
  const KEY = 'vault';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idb(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  const saveHandle = (h) => idb('readwrite', (s) => s.put(h, KEY));
  const loadHandle = () => idb('readonly', (s) => s.get(KEY)).catch(() => null);

  async function pickFolder() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'kelvin-notes' });
    await saveHandle(handle);
    return handle;
  }

  // Returns { handle, granted } for the remembered folder, or null if none.
  async function restore() {
    const handle = await loadHandle();
    if (!handle) return null;
    const state = await handle.queryPermission({ mode: 'readwrite' });
    return { handle, granted: state === 'granted' };
  }

  // Must be called from a click handler (browser requires a user gesture).
  async function regrant(handle) {
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  }

  async function dirOf(root, parts, create) {
    let dir = root;
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create });
    return dir;
  }

  function split(path) {
    const parts = path.split('/').filter(Boolean);
    return { dirs: parts.slice(0, -1), name: parts[parts.length - 1] };
  }

  // Missing file -> null (not an error), so callers can tell "empty" from "absent".
  async function readText(root, path) {
    const { dirs, name } = split(path);
    try {
      const dir = await dirOf(root, dirs, false);
      const file = await (await dir.getFileHandle(name)).getFile();
      return await file.text();
    } catch (e) {
      if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return null;
      throw e;
    }
  }

  async function writeText(root, path, text) {
    const { dirs, name } = split(path);
    const dir = await dirOf(root, dirs, true);
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
  }

  // All .md files as vault-relative paths (skips dot-folders like .obsidian).
  async function listMarkdown(root, prefix = '') {
    const out = [];
    for await (const [name, entry] of root.entries()) {
      if (name.startsWith('.')) continue;
      try {
        if (entry.kind === 'directory') out.push(...(await listMarkdown(entry, prefix + name + '/')));
        else if (name.endsWith('.md')) out.push({ path: prefix + name, size: (await entry.getFile()).size });
      } catch (e) {
        // One unreadable file (e.g. mid-write or cloud-only) must not break the whole list.
        if (name.endsWith('.md')) out.push({ path: prefix + name, size: 1 });
      }
    }
    return out;
  }

  window.VaultFs = { pickFolder, restore, regrant, readText, writeText, listMarkdown };
})();
