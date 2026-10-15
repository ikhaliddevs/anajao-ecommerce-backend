export type Logger = {
  info: (objectOrMessage?: unknown, message?: string) => void;
  warn: (objectOrMessage?: unknown, message?: string) => void;
  error: (objectOrMessage?: unknown, message?: string) => void;
  debug: (objectOrMessage?: unknown, message?: string) => void;
};
