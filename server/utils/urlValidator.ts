import { URL } from 'url';

export interface ValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
  code?: 'INVALID_PROTOCOL' | 'SSRF_BLOCKED' | 'INVALID_URL_FORMAT' | 'EMPTY_URL';
}

/**
 * Checks if an IP address string belongs to private/loopback/link-local/multicast ranges.
 */
function isPrivateOrReservedIP(ip: string): boolean {
  // Strip brackets if bracketed IPv6 like [::1]
  const unbracketed = ip.replace(/^\[|\]$/g, '');

  // Normalize IPv6 mapped IPv4 like ::ffff:127.0.0.1
  const ipv4MappedMatch = unbracketed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const cleanIp = ipv4MappedMatch ? ipv4MappedMatch[1] : unbracketed;

  // Check IPv4
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return true;

    const [a, b] = octets;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local / Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 100.64.0.0/10 (Shared Address Space)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    return false;
  }

  // Check IPv6
  const lowerIp = cleanIp.toLowerCase();
  if (
    lowerIp === '::1' ||
    lowerIp === '::' ||
    lowerIp.startsWith('fe80:') || // Link-local
    lowerIp.startsWith('fc00:') || // Unique local
    lowerIp.startsWith('fd00:')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF and syntax rules.
 */
export function validateAndNormalizeUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      valid: false,
      reason: 'URL string is required and cannot be empty.',
      code: 'EMPTY_URL',
    };
  }

  let trimmed = rawUrl.trim();

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    } else {
      return {
        valid: false,
        reason: 'URL must specify http:// or https:// protocol.',
        code: 'INVALID_PROTOCOL',
      };
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: 'The provided URL could not be parsed as a valid web address.',
      code: 'INVALID_URL_FORMAT',
    };
  }

  // Protocol check
  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return {
      valid: false,
      reason: `Protocol '${protocol}' is forbidden. Only HTTP and HTTPS are permitted.`,
      code: 'INVALID_PROTOCOL',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost and common loopback names
  const forbiddenHosts = [
    'localhost',
    'localhost.localdomain',
    'localhost6',
    'localhost6.localdomain6',
    'broadcasthost',
    '0.0.0.0',
  ];

  if (forbiddenHosts.includes(hostname)) {
    return {
      valid: false,
      reason: `Access to local host '${hostname}' is strictly prohibited for security (SSRF prevention).`,
      code: 'SSRF_BLOCKED',
    };
  }

  // Block internal domain suffixes
  const forbiddenSuffixes = ['.local', '.internal', '.lan', '.home', '.corp', '.host', '.cluster', '.invalid', '.test'];
  if (forbiddenSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    return {
      valid: false,
      reason: `Access to internal domain '${hostname}' is prohibited.`,
      code: 'SSRF_BLOCKED',
    };
  }

  // Check IP addresses directly
  if (isPrivateOrReservedIP(hostname)) {
    return {
      valid: false,
      reason: `Target host IP address '${hostname}' is in a private, loopback, or reserved network range.`,
      code: 'SSRF_BLOCKED',
    };
  }

  // Normalize: remove credentials, strip fragment, ensure standard path
  parsedUrl.username = '';
  parsedUrl.password = '';
  parsedUrl.hash = '';

  const normalizedUrl = parsedUrl.toString();

  return {
    valid: true,
    normalizedUrl,
  };
}
