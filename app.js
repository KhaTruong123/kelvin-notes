// Wires the three columns together: folder access on start, link opening, hotkeys, refresh on focus.
(function () {
  const $ = (id) => document.getElementById(id);
  let root = null;
  let tasks, freedom, detail;

  // Resolve a [[name]] like Obsidian: match any note with that file name, else create it under Tasks/.
  async function openLink(name) {
    const clean = TaskList.cleanName(name.split('/').pop().replace(/\.md$/i, ''));
    if (!clean) return;
    // Drop focus right away so keys typed while the note loads never land in another box.
    if (document.activeElement && document.activeElement.id === 'tasks-add') document.activeElement.blur();
    const files = await VaultFs.listMarkdown(root);
    const hit = files.find((f) => f.path.split('/').pop().slice(0, -3).toLowerCase() === clean.toLowerCase());
    const path = hit ? hit.path : `Tasks/${clean}.md`;
    if (path === 'Tasks.md') { if (!tasks.rawMode) await tasks.toggleRaw(); return; }
    const day = path.match(/^Freedom\/(\d{4}-\d{2}-\d{2})\.md$/);
    if (day) return freedom.open(day[1]);
    if (!(await detail.load(root, path))) return;
    $('detail-title').textContent = path.split('/').pop().slice(0, -3);
    $('detail-empty').hidden = true;
    $('detail-editor').hidden = false;
    $('detail-editor').focus();
  }

  async function start(handle) {
    root = handle;
    await tasks.load(root);
    await freedom.load(root);
    $('vault-name').textContent = handle.name || 'Thử nghiệm';
    $('gate').hidden = true;
    $('app').hidden = false;
  }

  function showGate(msg, btnText, onClick) {
    $('gate').hidden = false;
    $('app').hidden = true;
    $('gate-msg').textContent = msg;
    const btn = $('gate-btn');
    btn.textContent = btnText;
    btn.onclick = async () => {
      try { await onClick(); } catch (e) { if (e.name !== 'AbortError') $('gate-msg').textContent = 'Lỗi: ' + e.message; }
    };
  }

  async function boot() {
    tasks = new TasksPane({
      list: $('tasks-list'), raw: $('tasks-raw'), add: $('tasks-add'),
      modeBtn: $('tasks-mode'), status: $('tasks-status'),
    }, openLink);
    freedom = new FreedomPane({
      editor: $('freedom-editor'), status: $('freedom-status'), prev: $('day-prev'), next: $('day-next'),
      date: $('day-label'), today: $('day-today'), picker: $('day-picker'),
    }, openLink);
    detail = new NoteEditor($('detail-editor'), $('detail-status'), openLink);

    // ?demo keeps notes in the browser's private storage: lets you try the app without picking a folder.
    if (new URLSearchParams(location.search).has('demo')) return start(await navigator.storage.getDirectory());

    if (!window.showDirectoryPicker) {
      return showGate('Trình duyệt này không hỗ trợ ghi file. Hãy mở bằng Chrome hoặc Edge.', 'Thử lại', () => location.reload());
    }
    const saved = await VaultFs.restore();
    if (saved && saved.granted) return start(saved.handle);
    if (saved) {
      showGate(`Cho phép mở lại folder "${saved.handle.name}"`, 'Mở folder', async () => {
        if (await VaultFs.regrant(saved.handle)) await start(saved.handle);
        else $('gate-msg').textContent = 'Chưa được cho phép. Bấm lại hoặc chọn folder khác.';
      });
    }
    const pick = async () => start(await VaultFs.pickFolder());
    if (!saved) showGate('Chọn folder chứa note (có thể là folder trống).', 'Chọn folder', pick);
    $('gate-other').hidden = !saved;
    $('gate-other').onclick = () => pick().catch((e) => { if (e.name !== 'AbortError') $('gate-msg').textContent = 'Lỗi: ' + e.message; });
  }

  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
      e.preventDefault();
      document.body.classList.toggle(e.code === 'BracketLeft' ? 'hide-left' : 'hide-right');
    }
  });

  // Save pending text when switching away; reload files that may have changed elsewhere when coming back.
  document.addEventListener('visibilitychange', () => {
    if (!root) return;
    if (document.hidden) { detail.flush(); freedom.editor.flush(); tasks.rawEditor.flush(); return; }
    tasks.reloadIfClean(); detail.reloadIfClean(); freedom.editor.reloadIfClean(); freedom.renderNav();
  });
  window.addEventListener('beforeunload', (e) => {
    if (detail.dirty || freedom.editor.dirty || tasks.rawEditor.dirty) {
      detail.flush(); freedom.editor.flush(); tasks.rawEditor.flush();
      e.preventDefault();
    }
  });

  boot().catch((e) => {
    showGate('Không mở được folder: ' + e.message, 'Chọn folder khác', async () => start(await VaultFs.pickFolder()));
  });
})();
