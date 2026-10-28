import { describe, it, expect } from 'vitest';
import { resolveUrlOrSearch } from '../src/main/browser/url-resolver';

describe('URL and Search Query Resolver', () => {
  it('resolves empty input or new tab to adal://newtab', () => {
    expect(resolveUrlOrSearch('')).toBe('adal://newtab');
    expect(resolveUrlOrSearch('   ')).toBe('adal://newtab');
    expect(resolveUrlOrSearch('adal://newtab')).toBe('adal://newtab');
  });

  it('preserves full URLs with http and https schemes', () => {
    expect(resolveUrlOrSearch('https://example.com')).toBe('https://example.com');
    expect(resolveUrlOrSearch('http://example.org/test?q=1')).toBe('http://example.org/test?q=1');
  });

  it('prepends http:// for localhost and 127.0.0.1', () => {
    expect(resolveUrlOrSearch('localhost:3000')).toBe('http://localhost:3000');
    expect(resolveUrlOrSearch('localhost:5173/app')).toBe('http://localhost:5173/app');
    expect(resolveUrlOrSearch('127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
  });

  it('prepends https:// for valid domains without spaces', () => {
    expect(resolveUrlOrSearch('example.com')).toBe('https://example.com');
    expect(resolveUrlOrSearch('github.com/microsoft')).toBe('https://github.com/microsoft');
    expect(resolveUrlOrSearch('subdomain.site.org/path/item')).toBe('https://subdomain.site.org/path/item');
  });

  it('converts multi-word queries into default Google search URL', () => {
    expect(resolveUrlOrSearch('weather today')).toBe('https://www.google.com/search?q=weather%20today');
    expect(resolveUrlOrSearch('best AI tools')).toBe('https://www.google.com/search?q=best%20AI%20tools');
  });

  it('supports alternative search engines (DuckDuckGo, Bing, Brave)', () => {
    expect(resolveUrlOrSearch('quantum computing', 'duckduckgo')).toBe(
      'https://duckduckgo.com/?q=quantum%20computing'
    );
    expect(resolveUrlOrSearch('quantum computing', 'bing')).toBe(
      'https://www.bing.com/search?q=quantum%20computing'
    );
    expect(resolveUrlOrSearch('quantum computing', 'brave')).toBe(
      'https://search.brave.com/search?q=quantum%20computing'
    );
  });
});
