// Parse and edit Tasks.md line by line. Only the status character is ever rewritten,
// so any other text (headings, notes, blank lines) survives untouched.
(function () {
  const TASK_RE = /^(\s*[-*+] \[)(.)(\]\s?)([^\r]*)(\r?)$/;
  const LINK_RE = /\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|([^\]]+))?\]\]/;
  // Characters Obsidian and macOS do not allow in note file names.
  const BAD_NAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

  // Returns [{ index, raw, isTask, status, text, link, label }]
  function parse(text) {
    return text.split('\n').map((raw, index) => {
      const m = raw.match(TASK_RE);
      if (!m) return { index, raw, isTask: false };
      const body = m[4];
      const lm = body.match(LINK_RE);
      return {
        index,
        raw,
        isTask: true,
        status: m[2],
        text: body,
        link: lm ? lm[1].trim() : null,
        label: lm ? body.replace(LINK_RE, (_, name, alias) => alias || name) : body,
      };
    });
  }

  // Click on the box: done <-> not done. "[o]" (doing) is set by typing, click marks it done.
  function nextStatus(status) {
    return status === 'x' || status === 'X' ? ' ' : 'x';
  }

  function setStatus(text, lineIndex, status) {
    const lines = text.split('\n');
    lines[lineIndex] = lines[lineIndex].replace(TASK_RE, (_, a, _s, c, d, cr) => a + status + c + d + cr);
    return lines.join('\n');
  }

  function cleanName(title) {
    return title.replace(BAD_NAME_CHARS, ' ').replace(/\s+/g, ' ').trim();
  }

  // Append "- [ ] [[title]]" after the last non-empty line.
  function appendTask(text, title) {
    const name = cleanName(title);
    if (!name) return text;
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const body = text.replace(/\s+$/, '');
    return (body ? body + eol : '') + `- [ ] [[${name}]]` + eol;
  }

  // Find the [[link]] around a caret position in free text (for Cmd+click in editors).
  function linkAt(text, pos) {
    const re = new RegExp(LINK_RE.source, 'g');
    let m;
    while ((m = re.exec(text))) {
      if (pos >= m.index && pos <= m.index + m[0].length) return m[1].trim();
    }
    return null;
  }

  window.TaskList = { parse, nextStatus, setStatus, appendTask, cleanName, linkAt };
})();
