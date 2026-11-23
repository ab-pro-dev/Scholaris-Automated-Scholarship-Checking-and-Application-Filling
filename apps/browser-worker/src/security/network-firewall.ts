import dns from 'node:dns/promises';
import { Route, Request } from 'playwright';

// Allowed protocols for external scholarship browser automation
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'data:']);

// Standard web ports allowed
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
 * Checks if an IPv4 address is in a private, loopback, or link-local range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is blocked
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

  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private - Class B)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private - Class C)
  if (b0 === 192 && b1 === 168) return true;

  return false;
}

export function isBlockedHostOrIP(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Suffix checks
  if (FORBIDDEN_HOST_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(suffix))) {
    return true;
  }

  // IPv6 Loopback or Unique Local
  if (lower === '::1' || lower === '[::1]' || lower.startsWith('fc00:') || lower.startsWith('fe80:')) {
    return true;
  }

  // IPv4 check
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) {
    return isPrivateOrReservedIPv4(lower);
  }

  return false;
}

export interface FirewallDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether an outgoing Playwright HTTP request is safe from SSRF.
 */
export async function evaluateRequestSafety(urlStr: string): Promise<FirewallDecision> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { allowed: false, reason: 'MALFORMED_URL' };
  }

  // Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { allowed: false, reason: `DISALLOWED_PROTOCOL: ${parsed.protocol}` };
  }

  // Allow inline data: URIs (e.g. data:image/png) for static assets
  if (parsed.protocol === 'data:') {
    return { allowed: true };
  }

  // Web port check
  if (!ALLOWED_PORTS.has(parsed.port)) {
    return { allowed: false, reason: `DISALLOWED_PORT: ${parsed.port}` };
  }

  // Hostname string check
  if (isBlockedHostOrIP(parsed.hostname)) {
    return { allowed: false, reason: `BLOCKED_HOST_OR_IP: ${parsed.hostname}` };
  }

  // DNS resolution check (resolve hostname to IP to prevent DNS rebinding)
  try {
    const lookup = await dns.lookup(parsed.hostname);
    if (isPrivateOrReservedIPv4(lookup.address)) {
      return { allowed: false, reason: `DNS_RESOLVED_TO_PRIVATE_IP: ${lookup.address}` };
    }
  } catch (err: any) {
    // If DNS resolution fails, block the request
    return { allowed: false, reason: `DNS_RESOLUTION_FAILED: ${err.message}` };
  }

  return { allowed: true };
}

/**
 * Attaches the network firewall to a Playwright Route handler.
 */
export async function handleFirewallRoute(
  route: Route,
  request: Request,
  onBlocked?: (url: string, reason: string) => void
): Promise<void> {
  const url = request.url();
  const decision = await evaluateRequestSafety(url);

  if (!decision.allowed) {
    if (onBlocked) {
      onBlocked(url, decision.reason || 'SECURITY_POLICY_VIOLATION');
    }
    return route.abort('blockedbyclient');
  }

  return route.continue();
}
