/**
 * Minimal path shim for kuromoji in the browser.
 * path-browserify collapses "chrome-extension://" to "chrome-extension:/",
 * which breaks dictionary XHR URLs. Keep URL schemes intact.
 */
function join(...parts) {
  if (!parts.length) return "";
  const [head, ...rest] = parts;
  // Preserve scheme:// for chrome-extension / http(s)
  const schemeMatch = String(head).match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)(.*)$/);
  if (schemeMatch) {
    const scheme = schemeMatch[1];
    let body = schemeMatch[2].replace(/\/+$/, "");
    for (const p of rest) {
      const seg = String(p).replace(/^\/+/, "").replace(/\/+$/, "");
      if (seg) body = body ? `${body}/${seg}` : seg;
    }
    return scheme + body + (String(parts[parts.length - 1]).endsWith("/") ? "/" : "");
  }
  return parts
    .map((p, i) => {
      const s = String(p);
      if (i === 0) return s.replace(/\/+$/, "");
      return s.replace(/^\/+/, "").replace(/\/+$/, "");
    })
    .filter((s, i) => s || i === 0)
    .join("/");
}

module.exports = {
  join,
  dirname: (p) => {
    const s = String(p);
    const i = s.lastIndexOf("/");
    return i <= 0 ? "." : s.slice(0, i);
  },
  basename: (p) => {
    const s = String(p).replace(/\/+$/, "");
    const i = s.lastIndexOf("/");
    return i < 0 ? s : s.slice(i + 1);
  },
  resolve: (...parts) => join(...parts),
};
