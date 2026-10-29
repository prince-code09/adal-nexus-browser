export function resolveUrlOrSearch(
  input: string,
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'brave' = 'google'
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'adal://newtab';
  }

  if (trimmed === 'adal://newtab' || trimmed === 'about:blank') {
    return trimmed;
  }

  // Already has explicit protocol (http, https, file)
  if (/^(https?|file):\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Localhost with optional port
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  // Domain with standard TLD pattern without spaces
  // e.g., example.com, en.wikipedia.org/wiki/Earth, sub.site.co.uk
  const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\/?.*$/;
  if (!trimmed.includes(' ') && domainRegex.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Fallback to search query
  const query = encodeURIComponent(trimmed);
  switch (searchEngine) {
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${query}`;
    case 'bing':
      return `https://www.bing.com/search?q=${query}`;
    case 'brave':
      return `https://search.brave.com/search?q=${query}`;
    case 'google':
    default:
      return `https://www.google.com/search?q=${query}`;
  }
}
