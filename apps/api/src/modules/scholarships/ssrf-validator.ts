import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from '@scholaris/shared';

export class SSRFProtectionError extends AppError {
  constructor(reason: string, details?: unknown) {
    super(`URL rejected due to security policy: ${reason}`, 400, 'SSRF_VIOLATION', details);
    this.name = 'SSRFProtectionError';
  }
}

// Allowed protocols strictly limited to standard web protocols
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Allowed web ports
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

// Forbidden host suffixes
const FORBIDDEN_HOST_SUFFIXES = [
  'localhost',
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.localdomain',
  '.home',
  '.corp',
];

/**
 * Checks if an IPv4 address is in any private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private - Class A)
  if (b0 === 10) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata: 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private - Class B: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (b0 === 192 && b1 === 88 && parts[2] === 99) return true;

  // 192.168.0.0/16 (Private - Class C)
  if (b0 === 192 && b1 === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast: 224 - 239)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved: 240 - 255)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in any private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // IPv4-mapped IPv6: ::ffff:192.0.2.128 or ::ffff:7f00:1
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIPv4(v4Part);
    }
  }

  // Loopback (::1) and Unspecified (::)
  if (normalized === '::1' || normalized === '::') {
    return true;
  }

  // Unique Local Addresses (fc00::/7 -> fc00:... to fdff:...)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-Local Unicast (fe80::/10 -> fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) {
    return true;
  }

  return false;
}

/**
 * Checks if an IP (IPv4 or IPv6) is in any restricted/private range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateOrReservedIPv4(ip);
  }
  if (family === 6) {
    return isPrivateOrReservedIPv6(ip);
  }
  return true; // Non-standard or unparseable IP is rejected
}

export interface SSRFValidationResult {
  valid: boolean;
  normalizedUrl: string;
  hostname: string;
  resolvedIps: string[];
}

/**
 * Validates a raw URL for SSRF protection:
 * 1. Checks protocol (http/https only)
 * 2. Checks port (80, 443, 8080, 8443 only)
 * 3. Checks hostname against forbidden suffixes
 * 4. Resolves DNS and verifies all resolved IP addresses are public
 */
export async function validateUrlForSSRF(
  rawUrl: string,
  customResolver?: (host: string) => Promise<string[]>
): Promise<SSRFValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new SSRFProtectionError('URL must be a non-empty string');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new SSRFProtectionError('Malformed URL structure');
  }

  // 1. Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    throw new SSRFProtectionError(
      `Protocol '${parsed.protocol}' is not allowed. Only HTTP and HTTPS are permitted.`
    );
  }

  // 2. Port check
  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new SSRFProtectionError(
      `Port '${parsed.port}' is not permitted. Only standard web ports (80, 443, 8080, 8443) are allowed.`
    );
  }

  // 3. Hostname check
  let hostname = parsed.hostname.toLowerCase();
  // Strip IPv6 enclosing brackets e.g. [::1] -> ::1
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (!hostname || hostname.length === 0) {
    throw new SSRFProtectionError('URL hostname cannot be empty');
  }

  // Check forbidden host suffixes (localhost, .local, etc.)
  for (const suffix of FORBIDDEN_HOST_SUFFIXES) {
    if (hostname === suffix || hostname.endsWith(suffix)) {
      throw new SSRFProtectionError(
        `Hostname '${hostname}' is a reserved local or internal address.`
      );
    }
  }

  // 4. IP Literal check (e.g. 127.0.0.1, 169.254.169.254, 10.0.0.1, ::1)
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SSRFProtectionError(
        `IP address '${hostname}' points to a private, loopback, or cloud metadata network.`
      );
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname,
      resolvedIps: [hostname],
    };
  }

  // 5. DNS Resolution check
  let resolvedIps: string[] = [];
  try {
    if (customResolver) {
      resolvedIps = await customResolver(hostname);
    } else {
      const records = await dns.lookup(hostname, { all: true });
      resolvedIps = records.map((r) => r.address);
    }
  } catch (err: any) {
    throw new SSRFProtectionError(
      `Failed to resolve domain '${hostname}': ${err.message || 'DNS lookup failed'}`
    );
  }

  if (!resolvedIps || resolvedIps.length === 0) {
    throw new SSRFProtectionError(`Domain '${hostname}' does not resolve to any IP address.`);
  }

  // Verify all resolved addresses
  for (const ip of resolvedIps) {
    if (isPrivateOrReservedIp(ip)) {
      throw new SSRFProtectionError(
        `Domain '${hostname}' resolves to restricted IP '${ip}' (private, loopback, or cloud metadata).`
      );
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
    resolvedIps,
  };
}
