/**
 * Clipboard wrapper that uses Capacitor Clipboard on native
 * and falls back to navigator.clipboard in browser.
 */

let Clipboard = null;

async function getClipboard() {
  if (typeof window === 'undefined') return null;
  if (Clipboard) return Clipboard;
  try {
    const mod = await import('@capacitor/clipboard');
    Clipboard = mod.Clipboard;
    return Clipboard;
  } catch {
    return null;
  }
}

export async function writeToClipboard(text) {
  const clip = await getClipboard();
  if (clip) {
    await clip.write({ string: text });
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export async function readFromClipboard() {
  const clip = await getClipboard();
  if (clip) {
    const { value } = await clip.read();
    return value;
  }
  if (navigator.clipboard) {
    return navigator.clipboard.readText();
  }
  return '';
}

