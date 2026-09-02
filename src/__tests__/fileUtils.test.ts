import { describe, expect, it } from 'vitest';
import { formatBytes, isNavigable, joinRemotePath, sortRemoteEntries } from '../lib/fileUtils';
import { RemoteFileEntry } from '../types/file';

function entry(partial: Partial<RemoteFileEntry>): RemoteFileEntry {
  return { name: 'x', isDir: false, size: 0, modified: '', permissions: '-rw-rw----', ...partial };
}

describe('formatBytes', () => {
  it('formats byte counts into readable units', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
  });

  it('rejects non-finite input', () => {
    expect(formatBytes(-5)).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
  });
});

describe('joinRemotePath', () => {
  it('joins without double slashes and preserves trailing intent', () => {
    expect(joinRemotePath('/sdcard', 'Download')).toBe('/sdcard/Download');
    expect(joinRemotePath('/sdcard/', 'Download')).toBe('/sdcard/Download');
    expect(joinRemotePath('', 'root.txt')).toBe('/root.txt');
  });
});

describe('isNavigable', () => {
  it('treats directories and symlinked dirs as navigable', () => {
    expect(isNavigable(entry({ isDir: true }))).toBe(true);
    expect(isNavigable(entry({ permissions: 'lrwxrwxrwx' }))).toBe(true);
    expect(isNavigable(entry({ permissions: '-rw-rw----' }))).toBe(false);
  });
});

describe('sortRemoteEntries', () => {
  it('lists folders first, then alphabetical files', () => {
    const sorted = sortRemoteEntries([
      entry({ name: 'b.txt' }),
      entry({ name: 'Zeta', isDir: true }),
      entry({ name: 'a.txt' }),
      entry({ name: 'Alpha', isDir: true }),
    ]);

    expect(sorted.map((e) => e.name)).toEqual(['Alpha', 'Zeta', 'a.txt', 'b.txt']);
  });

  it('does not mutate the input array', () => {
    const input = [entry({ name: 'b.txt' }), entry({ name: 'a.txt' })];
    sortRemoteEntries(input);
    expect(input.map((e) => e.name)).toEqual(['b.txt', 'a.txt']);
  });
});
