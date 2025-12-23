import * as React from "react";

type Options<T> = {
  key: string;
  defaultValue: T;
  migrate?: (raw: unknown) => T;
};

export function usePersistedState<T>(options: Options<T>) {
  const { key, defaultValue, migrate } = options;

  const [state, setState] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw) as unknown;
      return migrate ? migrate(parsed) : (parsed as T);
    } catch {
      return defaultValue;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore (e.g. private mode / quota)
    }
  }, [key, state]);

  return [state, setState] as const;
}


