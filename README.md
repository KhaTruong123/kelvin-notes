# Kelvin Notes

A small note app in one folder: task list on the left, a detail note per task in the middle, and a free-writing page per day on the right. It runs in Chrome or Edge, with nothing to install and no build step.

Notes are plain `.md` files in a folder you choose. The folder layout is the same as an Obsidian vault, so the notes can be opened in Obsidian later.

```
<your notes folder>/
  Tasks.md                 task list:  - [ ] [[Task name]]
  Tasks/<Task name>.md     detail note for each task
  Freedom/2026-09-27.md    one free-writing note per day
```

This repo holds code only. Notes never go into the repo.

## Run it

1. Get the code:
   - with git: `git clone https://github.com/KhaTruong123/kelvin-notes.git`
   - or on GitHub: **Code > Download ZIP**, then unzip
2. Open `index.html` in **Chrome or Edge** (drag the file into the browser window). Safari cannot save files, so it will not work.
3. Click **Chọn folder** and pick an empty folder for your notes, for example `Documents/Notes`.
4. Next time you open the app, click **Mở folder** once so the browser lets the page use that folder again.

Tip: bookmark the page or pin the tab.

### If step 3 shows an error

Some managed browsers block pages opened straight from disk (`file://`). Serve the folder on your own machine instead. In Terminal, inside the code folder:

```
python3 -m http.server 8080
```

Then open http://localhost:8080 in Chrome. If `python3` is missing, run `npx serve` instead (needs Node).

### Try it without a folder

Open `index.html?demo` (or http://localhost:8080/?demo). Notes are kept in the browser's private storage, which is fine for a test but not for real notes.

## How to use

| Want to | Do this |
|---|---|
| Add a task | Type in **+ Thêm việc** at the bottom of the left column, press Enter |
| Mark done / not done | Click the box |
| Mark "doing" (orange) | **Sửa dạng chữ**, change `[ ]` to `[o]`, click **Xong** |
| Reorder or bulk edit tasks | **Sửa dạng chữ** edits `Tasks.md` as plain text |
| Open a task's detail note | Click the task name |
| Link to another note | Type `[[Note name]]`, then Cmd + click it to open |
| See another day's free writing | `‹` `›` on the right, or click the date for a list. **Hôm nay** returns to today |
| Hide left / right column | Cmd + `[` / Cmd + `]` |

Text saves by itself about half a second after you stop typing. The small status next to each title says "Đã lưu" when saved.

## Files

| File | What it does |
|---|---|
| `index.html`, `styles.css` | Page layout and look |
| `app.js` | Starts the app, opens links, shortcuts |
| `vault-fs.js` | Reads and writes files in the chosen folder |
| `task-list-parse.js` | Reads and edits the lines of `Tasks.md` |
| `tasks-pane.js` | Left column |
| `note-editor.js` | Text box with autosave, used by the middle and right columns |
| `freedom-pane.js` | Right column and day navigation |
