// Right column: one free-writing note per day in Freedom/YYYY-MM-DD.md, with a small day navigator.
(function () {
  const FOLDER = 'Freedom';
  const DAY_RE = /^Freedom\/(\d{4}-\d{2}-\d{2})\.md$/;

  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const label = (day, withYear) => new Date(day + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

  class FreedomPane {
    constructor(els, onOpenLink) {
      this.els = els; // { editor, status, prev, next, date, today, picker }
      this.editor = new NoteEditor(els.editor, els.status, onOpenLink);
      this.root = null;
      this.day = null;
      this.shownToday = null;

      els.prev.onclick = () => this.step(+1);
      els.next.onclick = () => this.step(-1);
      els.today.onclick = () => this.open(today());
      els.date.onclick = () => this.togglePicker();
      // Roll over to the new day's note if the app stays open past midnight.
      setInterval(() => {
        if (this.shownToday && this.shownToday !== today() && this.day === this.shownToday) this.open(today());
      }, 60 * 1000);
    }

    async load(root) {
      this.root = root;
      await this.open(today());
    }

    // Existing day notes, newest first. Empty past days are skipped to keep the list short.
    async days() {
      const t = today();
      const files = await VaultFs.listMarkdown(this.root);
      const list = files
        .map((f) => ({ day: (f.path.match(DAY_RE) || [])[1], size: f.size }))
        .filter((f) => f.day && (f.size > 0 || f.day === t))
        .map((f) => f.day);
      if (!list.includes(t)) list.push(t);
      return list.sort().reverse();
    }

    async open(day) {
      this.els.picker.hidden = true;
      if (!(await this.editor.load(this.root, `${FOLDER}/${day}.md`))) return;
      this.day = day;
      if (day === today()) this.shownToday = day;
      await this.renderNav();
    }

    async step(offset) {
      await this.editor.flush();
      const list = await this.days();
      const target = list[list.indexOf(this.day) + offset];
      if (target) this.open(target);
    }

    async renderNav() {
      if (!this.day) return;
      const list = await this.days();
      const i = list.indexOf(this.day);
      this.els.prev.disabled = i < 0 || i >= list.length - 1;
      this.els.next.disabled = i <= 0;
      this.els.date.textContent = label(this.day);
      this.els.today.hidden = this.day === today();
    }

    async togglePicker() {
      const picker = this.els.picker;
      if (!picker.hidden) { picker.hidden = true; return; }
      await this.editor.flush();
      picker.replaceChildren();
      for (const day of await this.days()) {
        const b = document.createElement('button');
        b.textContent = label(day, true);
        if (day === this.day) b.className = 'current';
        b.onclick = () => this.open(day);
        picker.append(b);
      }
      picker.hidden = false;
    }
  }

  window.FreedomPane = FreedomPane;
})();
