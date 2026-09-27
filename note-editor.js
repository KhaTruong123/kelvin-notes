// A plain-text markdown editor bound to one file: autosaves while typing,
// Cmd/Ctrl+click on a [[link]] asks the app to open that note.
// Never overwrites a file that changed on disk since we last read it: our text goes to a "(conflict)" copy instead.
(function () {
  const SAVE_DELAY_MS = 400;

  class NoteEditor {
    constructor(textarea, statusEl, onOpenLink) {
      this.ta = textarea;
      this.statusEl = statusEl;
      this.onOpenLink = onOpenLink;
      this.root = null;
      this.path = null;
      this.diskText = null; // what the file held when we last read or wrote it
      this.timer = null;
      this.loadSeq = 0;
      this.composing = false;
      this.saving = Promise.resolve();

      this.ta.addEventListener('input', () => this.schedule());
      this.ta.addEventListener('compositionstart', () => { this.composing = true; });
      this.ta.addEventListener('compositionend', () => { this.composing = false; });
      this.ta.addEventListener('click', (e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        const name = TaskList.linkAt(this.ta.value, this.ta.selectionStart);
        if (name) {
          e.preventDefault();
          this.onOpenLink(name);
        }
      });
    }

    get dirty() { return this.timer !== null; }

    async load(root, path) {
      await this.flush();
      await this.saving;
      const seq = ++this.loadSeq;
      this.ta.readOnly = true; // no typing while the new file is on its way
      let text = await VaultFs.readText(root, path);
      if (text === null) {
        text = '';
        await VaultFs.writeText(root, path, ''); // create it so it shows up like in Obsidian
      }
      if (seq !== this.loadSeq) return false; // a newer load() won; drop this one
      this.root = root;
      this.path = path;
      this.diskText = text;
      this.ta.value = text;
      this.ta.readOnly = false;
      this.ta.disabled = false;
      this.setStatus('');
      return true;
    }

    // Pick up edits made outside the app (e.g. in Obsidian) when nothing is pending here.
    async reloadIfClean() {
      await this.saving;
      const { path, loadSeq } = this;
      if (!path || this.dirty || this.composing) return;
      const text = await VaultFs.readText(this.root, path);
      if (text === null || loadSeq !== this.loadSeq || path !== this.path || this.dirty || this.composing) return;
      this.diskText = text;
      if (text === this.ta.value) return;
      const { selectionStart, selectionEnd } = this.ta;
      this.ta.value = text;
      this.ta.setSelectionRange(selectionStart, selectionEnd);
    }

    schedule() {
      if (!this.path) return;
      clearTimeout(this.timer);
      this.setStatus('Đang gõ…');
      this.timer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
    }

    flush() {
      clearTimeout(this.timer);
      if (this.timer === null || !this.path) { this.timer = null; return this.saving; }
      this.timer = null;
      const root = this.root, path = this.path, text = this.ta.value;
      this.saving = this.saving
        .then(() => this.write(root, path, text))
        .catch((e) => this.setStatus('Lỗi lưu: ' + e.message, true));
      return this.saving;
    }

    async write(root, path, text) {
      const disk = await VaultFs.readText(root, path);
      if (disk !== null && disk !== this.diskText && disk !== text && path === this.path) {
        const d = new Date();
        const p2 = (n) => String(n).padStart(2, '0');
        const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
        const copy = path.replace(/\.md$/, ` (conflict ${stamp}).md`);
        await VaultFs.writeText(root, copy, text);
        // Show the version on disk from now on, so later typing does not keep making copies.
        if (!this.dirty) { this.diskText = disk; this.ta.value = disk; }
        this.setStatus('File đã bị sửa ở nơi khác. Bản của bạn lưu vào: ' + copy.split('/').pop(), true);
        return;
      }
      await VaultFs.writeText(root, path, text);
      if (path === this.path) this.diskText = text;
      this.setStatus('Đã lưu');
    }

    setStatus(msg, isError) {
      if (!this.statusEl) return;
      this.statusEl.textContent = msg;
      this.statusEl.title = msg;
      this.statusEl.classList.toggle('error', !!isError);
    }
  }

  window.NoteEditor = NoteEditor;
})();
