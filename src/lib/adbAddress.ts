export function normalizeAdbAddress(address: string, defaultPort?: string): string | null {
  const match = address.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?$/);
  if (!match) return null;

  const octets = match[1].split('.').map(Number);
  if (octets.some((octet) => octet > 255)) return null;

  const portText = match[2] ?? defaultPort?.trim();
  if (!portText || !/^\d{1,5}$/.test(portText)) return null;

  const port = Number(portText);
  if (port < 1 || port > 65535) return null;

  return `${octets.join('.')}:${port}`;
}

export function isPairingCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
