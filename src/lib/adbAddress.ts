function normalizePort(portText: string | undefined): string | null {
  if (!portText || !/^\d{1,5}$/u.test(portText)) return null;
  const port = Number(portText);
  return port >= 1 && port <= 65535 ? String(port) : null;
}

function normalizeIpv4(host: string): string | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host)) return null;
  const octets = host.split('.').map(Number);
  return octets.some((octet) => octet > 255) ? null : octets.join('.');
}

function isIpv6(host: string): boolean {
  if (!host.includes(':') || !/^[0-9a-f:]+$/iu.test(host)) return false;
  if ((host.match(/::/gu) ?? []).length > 1) return false;
  const groups = host.split(':');
  if (host.includes('::')) {
    return groups.length <= 8 && groups.every((group) => group.length <= 4);
  }
  return groups.length === 8 && groups.every((group) => /^[0-9a-f]{1,4}$/iu.test(group));
}

function isHostname(host: string): boolean {
  if (host.length > 253 || !/^[a-z0-9.-]+$/iu.test(host)) return false;
  return host
    .split('.')
    .every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        !label.startsWith('-') &&
        !label.endsWith('-')
    );
}

/** Normalizes IPv4, bracketed IPv6, raw IPv6 (with a default port), or hostnames for ADB. */
export function normalizeAdbAddress(address: string, defaultPort?: string): string | null {
  const input = address.trim();
  if (!input) return null;

  if (input.startsWith('[')) {
    const match = input.match(/^\[([^\]]+)\](?::(\d{1,5}))?$/u);
    if (!match || !isIpv6(match[1])) return null;
    const port = normalizePort(match[2] ?? defaultPort?.trim());
    return port ? `[${match[1].toLowerCase()}]:${port}` : null;
  }

  const colonCount = (input.match(/:/gu) ?? []).length;
  if (colonCount > 1) {
    if (!isIpv6(input)) return null;
    const port = normalizePort(defaultPort?.trim());
    return port ? `[${input.toLowerCase()}]:${port}` : null;
  }

  const separator = input.lastIndexOf(':');
  const host = separator === -1 ? input : input.slice(0, separator);
  const explicitPort = separator === -1 ? undefined : input.slice(separator + 1);
  const looksLikeIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host);
  const normalizedHost = looksLikeIpv4
    ? normalizeIpv4(host)
    : isHostname(host)
      ? host.toLowerCase()
      : null;
  const port = normalizePort(explicitPort ?? defaultPort?.trim());
  return normalizedHost && port ? `${normalizedHost}:${port}` : null;
}

export function isPairingCode(code: string): boolean {
  return /^\d{6}$/u.test(code.trim());
}
