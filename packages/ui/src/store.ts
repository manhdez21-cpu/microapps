/** Persistencia local tolerante a fallos (modo privado, cuota, datos corruptos). */
export function loadJson<T>(key: string, validate: (raw: unknown) => T | null, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return fallback;
    return validate(JSON.parse(text)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
