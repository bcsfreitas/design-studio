// An artifact's title from its file name, without folder or extension. Navigation, canvases and new
// documents all title files through this one function, so a name reads the same everywhere:
//   "session-done" → "Session Done", "home_screen" → "Home Screen", "Home - new user" → "Home - New user"
// A spaced dash stays a dash; a bare hyphen or underscore becomes a space. Each part starts with a capital,
// and the rest of a name is kept as written, accents included.
export const artifactTitle = (name: string) => {
  const title = name
    .split(/\s+-\s+/)
    .map(part =>
      part
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    )
    .join(' - ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bLo ?fi\b/gi, 'Lo-fi')
    .replace(/\bHi ?fi\b/gi, 'Hi-fi');
  return title || name;
};
