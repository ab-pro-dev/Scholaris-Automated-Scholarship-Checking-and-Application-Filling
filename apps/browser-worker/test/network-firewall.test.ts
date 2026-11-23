import { describe, it, expect } from 'vitest';
import {
  evaluateRequestSafety,
  isBlockedHostOrIP,
  isPrivateOrReservedIPv4,
} from '../src/security/network-firewall.js';

describe('Browser Worker Network Firewall (TASK-021)', () => {
  it('identifies private, loopback, and cloud metadata IPv4 addresses', () => {
    // Loopback
    expect(isPrivateOrReservedIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIPv4('127.255.255.255')).toBe(true);

    // Cloud Metadata (AWS/GCP/Azure)
    expect(isPrivateOrReservedIPv4('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIPv4('169.254.1.1')).toBe(true);

    // RFC 1918 Private Ranges
    expect(isPrivateOrReservedIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIPv4('10.255.255.255')).toBe(true);
    expect(isPrivateOrReservedIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIPv4('192.168.1.1')).toBe(true);

    // Public IPs should not be flagged as private
    expect(isPrivateOrReservedIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIPv4('1.1.1.1')).toBe(false);
    expect(isPrivateOrReservedIPv4('129.67.1.1')).toBe(false); // Oxford University IP
  });

  it('blocks dangerous hostnames and private IPs', () => {
    expect(isBlockedHostOrIP('localhost')).toBe(true);
    expect(isBlockedHostOrIP('subdomain.localhost')).toBe(true);
    expect(isBlockedHostOrIP('app.local')).toBe(true);
    expect(isBlockedHostOrIP('service.internal')).toBe(true);
    expect(isBlockedHostOrIP('127.0.0.1')).toBe(true);
    expect(isBlockedHostOrIP('169.254.169.254')).toBe(true);
    expect(isBlockedHostOrIP('192.168.0.1')).toBe(true);

    expect(isBlockedHostOrIP('ox.ac.uk')).toBe(false);
    expect(isBlockedHostOrIP('daad.de')).toBe(false);
  });

  it('evaluates request safety: blocks non-web protocols, internal ports, and SSRF targets', async () => {
    // Disallowed Protocols
    const fileRes = await evaluateRequestSafety('file:///etc/passwd');
    expect(fileRes.allowed).toBe(false);
    expect(fileRes.reason).toContain('DISALLOWED_PROTOCOL');

    const ftpRes = await evaluateRequestSafety('ftp://files.org/data');
    expect(ftpRes.allowed).toBe(false);

    // Internal / Database Ports
    const postgresRes = await evaluateRequestSafety('http://example.com:5432/db');
    expect(postgresRes.allowed).toBe(false);
    expect(postgresRes.reason).toContain('DISALLOWED_PORT');

    const redisRes = await evaluateRequestSafety('http://example.com:6379');
    expect(redisRes.allowed).toBe(false);

    const minioRes = await evaluateRequestSafety('http://example.com:9000');
    expect(minioRes.allowed).toBe(false);

    const apiRes = await evaluateRequestSafety('http://example.com:3001');
    expect(apiRes.allowed).toBe(false);

    // Cloud Metadata endpoint
    const metadataRes = await evaluateRequestSafety('http://169.254.169.254/latest/meta-data');
    expect(metadataRes.allowed).toBe(false);
    expect(metadataRes.reason).toContain('BLOCKED_HOST_OR_IP');

    // Loopback
    const loopbackRes = await evaluateRequestSafety('http://127.0.0.1:8080');
    expect(loopbackRes.allowed).toBe(false);

    // Allowed inline data: URLs (e.g. inline images)
    const dataRes = await evaluateRequestSafety('data:image/png;base64,iVBORw0KGgo=');
    expect(dataRes.allowed).toBe(true);
  });
});
