import { describe, it, expect } from 'vitest';
import { validateAndNormalizeUrl } from '../server/utils/urlValidator';

describe('SSRF & URL Validation Suite', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    const res1 = validateAndNormalizeUrl('https://example.com');
    expect(res1.valid).toBe(true);
    expect(res1.normalizedUrl).toBe('https://example.com/');

    const res2 = validateAndNormalizeUrl('http://digitalheroesco.com/blog');
    expect(res2.valid).toBe(true);
    expect(res2.normalizedUrl).toBe('http://digitalheroesco.com/blog');
  });

  it('should normalize URLs by auto-prefixing https when protocol missing', () => {
    const res = validateAndNormalizeUrl('google.com');
    expect(res.valid).toBe(true);
    expect(res.normalizedUrl).toBe('https://google.com/');
  });

  it('should reject localhost and loopback IPv4/IPv6 (SSRF protection)', () => {
    const res1 = validateAndNormalizeUrl('http://localhost:3000');
    expect(res1.valid).toBe(false);
    expect(res1.code).toBe('SSRF_BLOCKED');

    const res2 = validateAndNormalizeUrl('http://127.0.0.1');
    expect(res2.valid).toBe(false);
    expect(res2.code).toBe('SSRF_BLOCKED');

    const res3 = validateAndNormalizeUrl('http://[::1]');
    expect(res3.valid).toBe(false);
    expect(res3.code).toBe('SSRF_BLOCKED');
  });

  it('should reject private IP ranges (SSRF protection)', () => {
    // 10.0.0.0/8
    expect(validateAndNormalizeUrl('http://10.0.0.1').valid).toBe(false);
    // 172.16.0.0/12
    expect(validateAndNormalizeUrl('http://172.20.0.15').valid).toBe(false);
    // 192.168.0.0/16
    expect(validateAndNormalizeUrl('http://192.168.1.1').valid).toBe(false);
    // Cloud Metadata 169.254.169.254
    expect(validateAndNormalizeUrl('http://169.254.169.254').valid).toBe(false);
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    const res = validateAndNormalizeUrl('ftp://files.example.com');
    expect(res.valid).toBe(false);
    expect(res.code).toBe('INVALID_PROTOCOL');
  });

  it('should reject internal domain suffixes (.local, .internal)', () => {
    expect(validateAndNormalizeUrl('http://service.local').valid).toBe(false);
    expect(validateAndNormalizeUrl('http://backend.internal').valid).toBe(false);
  });
});
