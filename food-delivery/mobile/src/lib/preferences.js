/**
 * Preferences wrapper that uses Capacitor Preferences on native
 * and falls back to localStorage in browser.
 */

let Preferences = null;

async function getPreferences() {
  if (typeof window === 'undefined') return null;
  if (Preferences) return Preferences;
  try {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
    return Preferences;
  } catch {
    return null;
  }
}

export async function setPreference(key, value) {
  const pref = await getPreferences();
  if (pref) {
    await pref.set({ key, value: JSON.stringify(value) });
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function getPreference(key) {
  const pref = await getPreferences();
  if (pref) {
    const { value } = await pref.get({ key });
    return value ? JSON.parse(value) : null;
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export async function removePreference(key) {
  const pref = await getPreferences();
  if (pref) {
    await pref.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

export async function clearPreferences() {
  const pref = await getPreferences();
  if (pref) {
    await pref.clear();
  } else {
    localStorage.clear();
  }
}

