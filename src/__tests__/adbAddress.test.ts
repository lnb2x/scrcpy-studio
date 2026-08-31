import { describe, expect, it } from 'vitest';
import { isPairingCode, normalizeAdbAddress } from '../lib/adbAddress';

describe('ADB wireless address validation', () => {
  it('normalizes a valid IPv4 address and default port', () => {
    expect(normalizeAdbAddress(' 192.168.1.7 ', '5555')).toBe('192.168.1.7:5555');
  });

  it('preserves an explicit valid port', () => {
    expect(normalizeAdbAddress('10.0.0.2:37123', '5555')).toBe('10.0.0.2:37123');
  });

  it('rejects invalid IP octets and ports', () => {
    expect(normalizeAdbAddress('999.1.1.1:5555')).toBeNull();
    expect(normalizeAdbAddress('10.0.0.2:0')).toBeNull();
    expect(normalizeAdbAddress('10.0.0.2:65536')).toBeNull();
  });

  it('requires an explicit port when no default is supplied', () => {
    expect(normalizeAdbAddress('192.168.1.7')).toBeNull();
  });

  it('accepts only six-digit pairing codes', () => {
    expect(isPairingCode('123456')).toBe(true);
    expect(isPairingCode('12345')).toBe(false);
    expect(isPairingCode('12345a')).toBe(false);
  });
});
