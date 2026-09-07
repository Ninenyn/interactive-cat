import { messages } from "./messages";
export const STORAGE_KEY = "jew-and-bo:v1";
export type Preferences = {
  version: 1;
  theme: "dark" | "light" | null;
  sound: boolean;
  seen: string[];
  favorites: string[];
  welcomed: boolean;
};
export const emptyPreferences = (): Preferences => ({
  version: 1,
  theme: null,
  sound: false,
  seen: [],
  favorites: [],
  welcomed: false,
});
const ids = new Set(messages.map((note) => note.id));
function validIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string => typeof id === "string" && ids.has(id),
          ),
        ),
      ].slice(-messages.length)
    : [];
}
export function parsePreferences(raw: string | null): Preferences {
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1) return emptyPreferences();
    return {
      version: 1,
      theme:
        data.theme === "dark" || data.theme === "light" ? data.theme : null,
      sound: data.sound === true,
      welcomed: data.welcomed === true,
      seen: validIds(data.seen),
      favorites: validIds(data.favorites),
    };
  } catch {
    return emptyPreferences();
  }
}
export function loadPreferences(): Preferences {
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyPreferences();
  }
}
export function savePreferences(data: Preferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
