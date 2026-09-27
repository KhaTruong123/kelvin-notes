// Left column: Tasks.md shown as a checklist, with a raw-text mode for reordering or bulk edits.
(function () {
  const PATH = 'Tasks.md';
  const STATUS_CLASS = { ' ': 'todo', o: 'doing', x: 'done', X: 'done' };

  class TasksPane {
    constructor(els, onOpen) {
      this.els = els; // { list, raw, add, modeBtn, status }
      this.onOpen = onOpen;
      this.root = null;
      this.text = '';
      this.rawMode = false;
      this.writing = Promise.resolve();
      this.rawEditor = new NoteEditor(els.raw, els.status, onOpen);

      els.add.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.isComposing) return; // isComposing: Vietnamese IME still typing
        e.preventDefault();
        this.add(els.add.value);
        els.add.value = '';
      });
      els.modeBtn.addEventListener('click', () => this.toggleRaw());
    }

    async load(root) {
      this.root = root;
      const text = await VaultFs.readText(root, PATH);
      this.text = text === null ? '' : text;
      if (text === null) await VaultFs.writeText(root, PATH, '');
      this.render();
    }

    // Every change is applied to a fresh read of Tasks.md, so edits made elsewhere are never overwritten.
    change(fn) {
      this.writing = this.writing
        .then(async () => {
          const disk = await VaultFs.readText(this.root, PATH);
          const next = fn(disk === null ? '' : disk);
          if (next === null) { this.text = disk || ''; return; } // file moved on; just show it
          this.text = next;
          await VaultFs.writeText(this.root, PATH, next);
          this.els.status.textContent = '';
        })
        .catch((e) => { this.els.status.textContent = 'Lỗi lưu: ' + e.message; })
        .then(() => this.render());
      return this.writing;
    }

    toggle(item) {
      return this.change((text) => {
        const line = TaskList.parse(text)[item.index];
        if (!line || line.raw !== item.raw) return null;
        return TaskList.setStatus(text, item.index, TaskList.nextStatus(item.status));
      });
    }

    add(title) {
      if (!TaskList.cleanName(title)) return;
      return this.change((text) => TaskList.appendTask(text, title));
    }

    async toggleRaw() {
      if (this.rawMode) {
        await this.rawEditor.flush();
        await this.rawEditor.saving;
        const disk = await VaultFs.readText(this.root, PATH);
        this.text = disk === null ? this.els.raw.value : disk;
      } else {
        await this.writing;
        await this.rawEditor.load(this.root, PATH);
      }
      this.rawMode = !this.rawMode;
      this.els.list.hidden = this.els.add.hidden = this.rawMode;
      this.els.raw.hidden = !this.rawMode;
      this.els.modeBtn.textContent = this.rawMode ? 'Xong' : 'Sửa dạng chữ';
      if (this.rawMode) this.els.raw.focus();
      else this.render();
    }

    async reloadIfClean() {
      if (!this.root) return;
      if (this.rawMode) return this.rawEditor.reloadIfClean();
      await this.writing;
      const text = await VaultFs.readText(this.root, PATH);
      if (text !== null && text !== this.text) {
        this.text = text;
        this.render();
      }
    }

    render() {
      const ul = this.els.list;
      ul.replaceChildren();
      for (const item of TaskList.parse(this.text)) {
        if (!item.isTask && !item.raw.trim()) continue;
        const li = document.createElement('li');
        if (!item.isTask) {
          li.className = 'plain';
          li.textContent = item.raw.replace(/^#+\s*/, '');
          ul.append(li);
          continue;
        }
        li.className = 'task ' + (STATUS_CLASS[item.status] || 'todo');
        const box = document.createElement('button');
        box.className = 'box';
        box.setAttribute('aria-label', 'Đổi trạng thái');
        box.onclick = () => this.toggle(item);
        const title = document.createElement(item.link ? 'a' : 'span');
        title.className = 'title';
        title.textContent = item.label || '(trống)';
        if (item.link) {
          title.href = '#';
          title.onclick = (e) => { e.preventDefault(); this.onOpen(item.link); };
        }
        li.append(box, title);
        ul.append(li);
      }
    }
  }

  window.TasksPane = TasksPane;
})();
