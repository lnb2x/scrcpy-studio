import { RemoteFileEntry } from '@/types/file';

/** Formats a byte count into a human readable string ("1.5 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1);
  const value = bytes / 2 ** (exponent * 10);
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}

/** Joins a remote base path and entry name into a normalized POSIX path. */
export function joinRemotePath(base: string, name: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  if (!trimmedBase) return `/${name}`;
  return `${trimmedBase}/${name}`;
}

/** True when the entry is navigable (directories and symlinks resolving to dirs). */
export function isNavigable(entry: RemoteFileEntry): boolean {
  return entry.isDir || entry.permissions.startsWith('l');
}

/** Folders first, then files, both alphabetically (locale-aware). */
export function sortRemoteEntries(entries: RemoteFileEntry[]): RemoteFileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}
