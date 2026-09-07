"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  emptyPreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "@/heart-notes/storage";
const serverPreferences = emptyPreferences();
class PreferencesStore {
  private value = serverPreferences;
  private listeners = new Set<() => void>();
  persistent = true;
  getSnapshot = () => this.value;
  getServerSnapshot = () => serverPreferences;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  hydrate() {
    this.value = loadPreferences();
    this.listeners.forEach((fn) => fn());
  }
  update(patch: Partial<Preferences>) {
    this.value = { ...this.value, ...patch };
    this.persistent = savePreferences(this.value);
    this.listeners.forEach((fn) => fn());
  }
}
export function useRoomPreferences() {
  const [store] = useState(() => new PreferencesStore());
  const preferences = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return { preferences, store };
}
export function useMedia(query: string) {
  return useSyncExternalStore(
    (change) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", change);
      return () => media.removeEventListener("change", change);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export function useVisible() {
  return useSyncExternalStore(
    (change) => {
      document.addEventListener("visibilitychange", change);
      return () => document.removeEventListener("visibilitychange", change);
    },
    () => !document.hidden,
    () => true,
  );
}
