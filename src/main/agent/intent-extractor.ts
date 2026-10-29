/**
 * AdaL Nexus Universal Intent & Entity Extraction Engine
 * 
 * Provides generic, multilingual (English, Hindi, Hinglish) natural language
 * understanding for the autonomous browser agent without hardcoded assumptions.
 * 
 * Principles:
 * 1. Mode A (Conversational): Questions, explanations, advice, definitions remain in chat.
 * 2. Mode B/C/D (Actions): Genuine execution ONLY when user gives explicit imperative commands.
 * 3. Authentic Entity Extraction: Accurately identifies user targets across SVO and SOV word orders.
 * 4. Direct Navigation: Opens requested websites directly without unnecessary search redirection.
 * 5. Context Isolation: Current entities take strict precedence over historical context.
 */

import type { TaskContext } from './adapters/ai-adapter';

export interface ExtractedIntent {
  isQuestion: boolean;
  platform?: 'youtube' | 'amazon' | 'linkedin' | 'google' | 'github' | 'notes_gallery' | 'general';
  actionType?: 'play' | 'navigate' | 'search' | 'post' | 'delete' | 'info';
  targetEntity: string;
  isAnaphoric: boolean;
}

export interface KnownPlatform {
  name: string;
  url: string;
  aliases: string[];
}

export const KNOWN_PLATFORMS: KnownPlatform[] = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com',
    aliases: ['linkedin', 'linkdin', 'linkeldin', 'linked in', 'linkin', 'linkden'],
  },
  {
    name: 'Microsoft Office',
    url: 'https://www.office.com',
    aliases: ['microsoft office', 'ms office', 'office.com', 'office 365', 'microsoft 365', 'office'],
  },
  {
    name: 'BBD University',
    url: 'https://bbdu.ac.in',
    aliases: ['bbd', 'bbdu', 'bbd university', 'babu banarasi das university', 'babu banarasi das'],
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    aliases: ['youtube', 'yt', 'you tube', 'yotube', 'youtub'],
  },
  {
    name: 'Gmail',
    url: 'https://mail.google.com',
    aliases: ['gmail', 'g-mail', 'g mail', 'google mail', 'mail google'],
  },
  {
    name: 'Amazon',
    url: 'https://www.amazon.in',
    aliases: ['amazon', 'amazn', 'amzon', 'amazone'],
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    aliases: ['github', 'git hub', 'githb'],
  },
  {
    name: 'Google',
    url: 'https://www.google.com',
    aliases: ['google', 'gogle', 'googl'],
  },
  {
    name: 'X (Twitter)',
    url: 'https://x.com',
    aliases: ['twitter', 'x.com', 'x twitter', 'twtr'],
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    aliases: ['reddit', 'redit'],
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com',
    aliases: ['instagram', 'insta', 'ig'],
  },
  {
    name: 'WhatsApp Web',
    url: 'https://web.whatsapp.com',
    aliases: ['whatsapp', 'wa web', 'whatsapp web', 'web whatsapp'],
  },
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    aliases: ['wikipedia', 'wiki'],
  },
];

export interface NavigationClassification {
  isNavigation: boolean;
  isGeneralSearch: boolean;
  isClarificationNeeded: boolean;
  destinationUrl?: string;
  targetName?: string;
  searchKeywords?: string;
  clarificationMessage?: string;
  isNotesGallery?: boolean;
}

/**
 * Strips conversational filler and honorific prefixes in English, Hindi, Hinglish:
 * "bhai", "bhaiya", "bro", "yaar", "dost", "please", "plz", "kripya", "arre", "suno", "sun", "can you", "could you", etc.
 */
export function stripConversationalPrefixes(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(
    /^(?:bhai\s+|bhaiya\s+|bro\s+|yaar\s+|dost\s+|please\s+|plz\s+|kripya\s+|arre\s+|suno\s+|sun\s+|can\s+you\s+|could\s+you\s+|just\s+|ab\s+|aab\s+|now\s+)+/gi,
    ''
  );
  return cleaned.trim();
}

/**
 * Checks whether the goal represents an informational or conversational inquiry (Mode A).
 * True: Must be answered in chat with zero browser navigation and zero file generation.
 * False: Imperative action command to be executed.
 */
export function isConversationalQuery(goal: string): boolean {
  if (!goal) return true;
  const lower = goal.toLowerCase().trim();

  // If query is an instructional or how-to question (e.g. "How do I upload a LinkedIn post?", "kaise upload karte hain")
  const isHowToQuestion =
    lower.startsWith('how to') ||
    lower.startsWith('how do') ||
    lower.startsWith('how can') ||
    lower.includes('kaise upload') ||
    lower.includes('kaise karte') ||
    lower.includes('kaise kare') ||
    lower.includes('ke steps') ||
    lower.includes('steps batao') ||
    lower.includes('tarika kya hai') ||
    lower.includes('tarika batao');

  if (isHowToQuestion) {
    return true;
  }

  // Explicit action imperatives that indicate real browser execution
  const hasActionVerb =
    lower.includes('kholo') ||
    lower.includes('open in') ||
    lower.includes('open karo') ||
    lower.includes('khol kar') ||
    lower.includes('kholke') ||
    lower.includes('chalao') ||
    lower.includes('chala do') ||
    lower.includes('play karo') ||
    lower.includes('play kijiye') ||
    lower.includes('upload karo') ||
    lower.includes('publish karo') ||
    lower.includes('post karo') ||
    lower.includes('delete karo') ||
    lower.includes('hatao') ||
    lower.includes('mitao') ||
    lower.includes('nikalo') ||
    lower.includes('nikaalo') ||
    (lower.startsWith('open ') && !lower.includes('meaning') && !lower.includes('definition')) ||
    (lower.startsWith('play ') && !lower.includes('how to play') && !lower.includes('kaise play')) ||
    (lower.startsWith('visit ') || lower.startsWith('go to '));

  // Question patterns (English & Hindi/Hinglish)
  const isQuestionPattern =
    lower.startsWith('what is') ||
    lower.startsWith('what are') ||
    lower.startsWith('who is') ||
    lower.startsWith('who are') ||
    lower.startsWith('which ') ||
    lower.startsWith('why ') ||
    lower.startsWith('tell me about') ||
    lower.startsWith('explain ') ||
    lower.startsWith('can you explain') ||
    lower.startsWith('can you tell') ||
    lower.startsWith('define ') ||
    lower.includes('kya hai') ||
    lower.includes('kya h') ||
    lower.includes('kya hota hai') ||
    lower.includes('kaun sa') ||
    lower.includes('kaun si') ||
    lower.includes('ke bare mein') ||
    lower.includes('ke baare mein') ||
    lower.includes('ke bare me') ||
    lower.includes('requirements kya') ||
    lower.includes('playlist batao') ||
    lower.includes('playlists batao') ||
    lower.includes('best playlist') ||
    lower.includes('best playlists') ||
    lower.includes('achhi series batao') ||
    lower.includes('kaun si playlist') ||
    (lower.includes('batao') && !hasActionVerb) ||
    (lower.includes('recommend') && !hasActionVerb) ||
    (lower.endsWith('?') && !hasActionVerb);

  if (isQuestionPattern && !hasActionVerb) {
    return true;
  }

  // If there's an action verb, it is an action command unless framed as an informational how-to
  if (hasActionVerb) {
    return false;
  }

  // Default: If no explicit action verb, treat as conversational/informational to prevent accidental navigation
  return isQuestionPattern;
}

/**
 * Classifies whether a user instruction represents a direct website navigation,
 * a product catalog search, a genuine web search, or an ambiguous destination requiring clarification.
 */
export function classifyNavigationIntent(goal: string): NavigationClassification {
  if (!goal || !goal.trim()) {
    return { isNavigation: false, isGeneralSearch: false, isClarificationNeeded: false };
  }

  // If this is an informational query (Mode A, e.g. "What is LinkedIn?", "LinkedIn par post kaise upload karte hain?"), do NOT treat as navigation
  if (isConversationalQuery(goal)) {
    return { isNavigation: false, isGeneralSearch: false, isClarificationNeeded: false };
  }

  const lower = goal.toLowerCase().trim();
  const cleaned = stripConversationalPrefixes(lower);

  // Check for explicit navigation verbs
  const hasNavVerb =
    cleaned.includes('kholo') ||
    cleaned.includes('open karo') ||
    cleaned.includes('open in') ||
    cleaned.includes('khol kar dikhao') ||
    cleaned.includes('kholke dikhao') ||
    cleaned.includes('open karke dikhao') ||
    cleaned.includes('wali website') ||
    cleaned.includes('pe jao') ||
    cleaned.includes('par jao') ||
    cleaned.startsWith('open ') ||
    cleaned.startsWith('visit ') ||
    cleaned.startsWith('go to ') ||
    cleaned === 'open';

  // If this is a research or multi-step analysis task (Mode D: laptops, startups, price comparison, webpage summarization),
  // DO NOT treat as single-step browser navigation. Research stays inside chatbot and background engine.
  const isResearchQuery =
    cleaned.includes('research') ||
    (cleaned.includes('laptop') && !cleaned.includes('website') && !cleaned.includes('khol')) ||
    cleaned.includes('compare') ||
    cleaned.includes('cheapest') ||
    cleaned.includes('summarize');

  if (isResearchQuery && !hasNavVerb) {
    return { isNavigation: false, isGeneralSearch: false, isClarificationNeeded: false };
  }

  // Check if user wants to open Notes Gallery
  if (
    cleaned.includes('notes gallery') ||
    cleaned === 'notes kholo' ||
    cleaned === 'open notes' ||
    cleaned === 'notes open karo'
  ) {
    return {
      isNavigation: true,
      isGeneralSearch: false,
      isClarificationNeeded: false,
      isNotesGallery: true,
      targetName: 'Notes Gallery',
    };
  }

  // Check for catalog discovery commands (e.g. "16 GB RAM wale laptops ki website khol kar dikhao", "open a website showing 16 GB RAM laptops")
  if (
    cleaned.includes('laptop') &&
    (cleaned.includes('options') || cleaned.includes('website') || cleaned.includes('dikhao') || cleaned.includes('khol kar'))
  ) {
    return {
      isNavigation: true,
      isGeneralSearch: false,
      isClarificationNeeded: false,
      destinationUrl: 'https://www.amazon.in/s?k=laptops+16gb+ram',
      targetName: 'Amazon (16 GB RAM Laptops)',
    };
  }

  // Check if query matches known platforms
  for (const plat of KNOWN_PLATFORMS) {
    const matchedAlias = plat.aliases.find((alias) => {
      // Check word boundaries for alias
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
      return regex.test(cleaned);
    });

    if (matchedAlias) {
      // If it contains a search verb (e.g. "google par weather in delhi search karo", "amazon par wireless mouse search karo")
      if (
        (/\bsearch\b/i.test(cleaned) || cleaned.includes('dhoondo') || cleaned.includes('find')) &&
        !cleaned.includes('research') &&
        !hasNavVerb &&
        !cleaned.includes('kholo')
      ) {
        // Extract meaningful search term by stripping platform and search verbs
        let searchKeywords = cleaned
          .replace(new RegExp(`\\b${matchedAlias}\\b`, 'gi'), '')
          .replace(/\b(?:par|pe|me|se|on|in|at|ke|ki|ka)\b/gi, '')
          .replace(/\b(?:search\s*karo|search\s*kijiye|search|dhoondo|dhundho|find)\b/gi, '')
          .trim();
        searchKeywords = stripConversationalPrefixes(searchKeywords);

        if (searchKeywords.length >= 2) {
          let searchUrl = '';
          if (plat.name === 'Amazon') {
            searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchKeywords)}`;
          } else if (plat.name === 'YouTube') {
            searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchKeywords)}`;
          } else {
            const queryForSearch =
              plat.name !== 'Google' && !searchKeywords.toLowerCase().includes(plat.name.toLowerCase())
                ? `${plat.name} ${searchKeywords}`.trim()
                : searchKeywords;
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(queryForSearch)}`;
          }
          return {
            isNavigation: true,
            isGeneralSearch: true,
            isClarificationNeeded: false,
            destinationUrl: searchUrl,
            targetName: `${plat.name} Search: "${searchKeywords}"`,
            searchKeywords,
          };
        }
      }

      // If it has navigation verb or user directly named the platform (e.g. "bhai linkdin kholo", "open linkedin", "Gmail kholo")
      return {
        isNavigation: true,
        isGeneralSearch: false,
        isClarificationNeeded: false,
        destinationUrl: plat.url,
        targetName: plat.name,
      };
    }
  }

  // Check for raw URL or domain with explicit navigation verb (e.g. "open https://example.com", "open google.com", "visit wikipedia.org")
  const urlMatch =
    goal.match(/https?:\/\/[^\s]+/i) ||
    goal.match(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/);

  if (urlMatch && hasNavVerb) {
    let rawUrl = urlMatch[0];
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }
    return {
      isNavigation: true,
      isGeneralSearch: false,
      isClarificationNeeded: false,
      destinationUrl: rawUrl,
      targetName: rawUrl,
    };
  }

  // If user gave a general open command with NO identifiable destination (e.g. "kholo", "open website", "bhai open karo")
  if (
    cleaned === 'kholo' ||
    cleaned === 'open' ||
    cleaned === 'open karo' ||
    cleaned === 'website kholo' ||
    cleaned === 'open website' ||
    cleaned === 'page kholo'
  ) {
    return {
      isNavigation: false,
      isGeneralSearch: false,
      isClarificationNeeded: true,
      clarificationMessage: 'Which website or page would you like me to open? (e.g. LinkedIn, YouTube, Gmail, Amazon, or enter a URL)',
    };
  }

  // If there's an explicit search request without a specific engine (e.g. "search weather in delhi", "Latest AI browser technologies search karo", "Find websites for hackathon preparation")
  if (
    (cleaned.startsWith('search ') || /\bsearch\s*(?:karo|kijiye)?\b/i.test(cleaned) || cleaned.startsWith('find ')) &&
    !cleaned.includes('research') &&
    !hasNavVerb
  ) {
    const searchTerms = cleaned
      .replace(/^(?:search\s+(?:for\s+)?|find\s+)/gi, '')
      .replace(/\s*search\s*(?:karo|kijiye)?$/gi, '')
      .trim();
    if (searchTerms.length >= 2) {
      return {
        isNavigation: true,
        isGeneralSearch: true,
        isClarificationNeeded: false,
        destinationUrl: `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`,
        targetName: `Google Search: "${searchTerms}"`,
        searchKeywords: searchTerms,
      };
    }
  }

  // Check for unfamiliar website / domain requests (e.g. "Hackbriven website kholo", "open hackbriven website", "BBD ki website kholo")
  const websiteCmdMatch =
    cleaned.match(/(?:open|visit|khol kar dikhao|kholke dikhao|kholo|open karo)\s+([a-zA-Z0-9_\s-]+?)\s*(?:ki\s+)?website\b/i) ||
    cleaned.match(/\b([a-zA-Z0-9_\s-]+?)\s*(?:ki\s+)?website\s*(?:kholo|open karo|open|khol kar dikhao)\b/i);

  if (websiteCmdMatch && websiteCmdMatch[1]) {
    const rawEntity = websiteCmdMatch[1].trim();
    const candidateEntity = stripConversationalPrefixes(rawEntity);
    if (candidateEntity.length >= 2 && !candidateEntity.includes('search')) {
      return {
        isNavigation: true,
        isGeneralSearch: true,
        isClarificationNeeded: false,
        destinationUrl: `https://www.google.com/search?q=${encodeURIComponent(`${candidateEntity} official website`)}`,
        targetName: `${candidateEntity} (Official Website Search)`,
        searchKeywords: `${candidateEntity} official website`,
      };
    }
  }

  return { isNavigation: false, isGeneralSearch: false, isClarificationNeeded: false };
}

export interface AcademicQueryInfo {
  university?: string;
  course?: string;
  year?: string;
  semester?: string;
  subject?: string;
  unit?: string;
  category: 'PYQ' | 'Notes' | 'Syllabus' | 'Sample Paper' | 'PDF' | 'General';
  searchTerm: string;
}

/**
 * Extracts academic entities generically from student queries without hardcoding narrow defaults like DSTL.
 */
export function extractAcademicQuery(text: string): AcademicQueryInfo {
  if (!text) return { category: 'General', searchTerm: '' };
  const lower = text.toLowerCase();

  // University
  let university: string | undefined = undefined;
  if (/\baktu\b/i.test(lower)) university = 'AKTU';
  else if (/\buptu\b/i.test(lower)) university = 'UPTU';
  else if (/\bbbdu?\b/i.test(lower)) university = 'BBDU';
  else if (/\bdu\b/i.test(lower)) university = 'Delhi University';
  else if (/\bipu\b/i.test(lower)) university = 'IPU';

  // Course
  let course: string | undefined = undefined;
  if (/\bb\.?\s*tech\b/i.test(lower) || /\bbtech\b/i.test(lower)) course = 'B.Tech';
  else if (/\bm\.?\s*tech\b/i.test(lower) || /\bmtech\b/i.test(lower)) course = 'M.Tech';
  else if (/\bbca\b/i.test(lower)) course = 'BCA';
  else if (/\bmca\b/i.test(lower)) course = 'MCA';
  else if (/\bbba\b/i.test(lower)) course = 'BBA';
  else if (/\bmba\b/i.test(lower)) course = 'MBA';
  else if (/\bb\.?\s*sc\b/i.test(lower)) course = 'B.Sc';

  // Year
  let year: string | undefined = undefined;
  if (/\b(?:2nd|second|2)\s*(?:year|yr|saal)\b/i.test(lower)) year = '2nd Year';
  else if (/\b(?:1st|first|1)\s*(?:year|yr|saal)\b/i.test(lower)) year = '1st Year';
  else if (/\b(?:3rd|third|3)\s*(?:year|yr|saal)\b/i.test(lower)) year = '3rd Year';
  else if (/\b(?:4th|fourth|4)\s*(?:year|yr|saal)\b/i.test(lower)) year = '4th Year';

  // Semester
  let semester: string | undefined = undefined;
  const semMatch = lower.match(/\b(?:sem(?:ester)?\s*([1-8])|([1-8])(?:st|nd|rd|th)?\s*sem(?:ester)?)\b/i);
  if (semMatch) {
    const semNum = semMatch[1] || semMatch[2];
    semester = `Semester ${semNum}`;
  }

  // Unit
  let unit: string | undefined = undefined;
  const unitMatch = lower.match(/\bunit\s*([1-5])\b/i);
  if (unitMatch) {
    unit = `Unit ${unitMatch[1]}`;
  }

  // Category
  let category: 'PYQ' | 'Notes' | 'Syllabus' | 'Sample Paper' | 'PDF' | 'General' = 'General';
  if (/\bpyqs?\b/i.test(lower) || lower.includes('previous year') || lower.includes('purane paper')) {
    category = 'PYQ';
  } else if (lower.includes('syllabus')) {
    category = 'Syllabus';
  } else if (lower.includes('sample paper') || lower.includes('model paper')) {
    category = 'Sample Paper';
  } else if (lower.includes('notes') || lower.includes('note')) {
    category = 'Notes';
  } else if (lower.includes('pdf')) {
    category = 'PDF';
  }

  // Subject (Only if explicitly mentioned; NEVER default to DSTL)
  let subject: string | undefined = undefined;
  if (/\bdstl\b/i.test(lower)) subject = 'DSTL';
  else if (/\bcoa\b/i.test(lower)) subject = 'COA';
  else if (/\bdbms\b/i.test(lower)) subject = 'DBMS';
  else if (/\bcyber\s*security\b/i.test(lower)) subject = 'Cyber Security';
  else if (/\boperating\s*systems?\b|\bos\b/i.test(lower)) subject = 'Operating Systems';
  else if (/\bdata\s*structures?\b|\bdsa\b/i.test(lower)) subject = 'Data Structures';
  else if (/\bcomputer\s*networks?\b|\bcn\b/i.test(lower)) subject = 'Computer Networks';
  else if (/\bsoftware\s*(?:engineering|engg?)\b/i.test(lower)) subject = 'Software Engineering';
  else if (/\bdiscrete\s*mathematics\b/i.test(lower)) subject = 'Discrete Mathematics';

  // Build authentic search query terms
  const terms: string[] = [];
  if (university) terms.push(university);
  if (course) terms.push(course);
  if (year) terms.push(year);
  if (semester) terms.push(semester);
  if (subject) terms.push(subject);
  if (unit) terms.push(unit);
  if (category !== 'General') terms.push(category);

  const searchTerm = terms.length > 0 ? terms.join(' ') : stripConversationalPrefixes(text);

  return {
    university,
    course,
    year,
    semester,
    subject,
    unit,
    category,
    searchTerm,
  };
}

/**
 * Extracts the user's authentic target entity / query from natural language commands.
 * Handles both English SVO ("play saiyara on youtube") and Hindi/Hinglish SOV ("youtube kholo aur saiyara gana chalao").
 */
export function extractTargetEntity(goal: string): string {
  if (!goal || !goal.trim()) return '';

  let cleaned = goal.trim();

  // Strip enclosing quotes
  cleaned = cleaned.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

  // If there is an explicit colon for structured input (e.g. "Upload post to LinkedIn: My text")
  if (cleaned.includes(':') && !cleaned.toLowerCase().startsWith('http')) {
    const parts = cleaned.split(/:(.+)/);
    if (parts[1] && parts[1].trim()) {
      return parts[1].trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
    }
  }

  // 0. Remove conversational / temporal lead-in tokens
  cleaned = stripConversationalPrefixes(cleaned);

  // 1. Remove platform prefix/suffix phrases
  cleaned = cleaned.replace(/\b(?:open|visit|launch)\s+(?:youtube|google|amazon|github|linkedin|reddit|twitter|x)\s*(?:and|aur|karke)?\s*/gi, ' ');
  cleaned = cleaned.replace(/\b(?:youtube|google|amazon|github|linkedin|reddit|twitter|x)\s*(?:par|pe|me|se|kholo\s*aur|open\s*karo\s*aur|kholo|open\s*karo|open)\s*/gi, ' ');
  cleaned = cleaned.replace(/\b(?:on|in|at|from)\s+(?:youtube|google|amazon|github|linkedin|reddit|twitter|x)\b/gi, ' ');
  cleaned = cleaned.replace(/\b(?:youtube|google|amazon|github|linkedin|reddit|twitter|x)\b/gi, ' ');

  // 2. Remove command verbs from beginning (English SVO prefixes)
  cleaned = cleaned.replace(/^(?:please\s+|kripya\s+)?(?:play\s+(?:the\s+)?(?:song|video|playlist|track|music|series)?|search\s+(?:for)?|find|look\s+up|open\s+and\s+play|open|show\s+me|show)\s+/gi, ' ');

  // 3. Remove command verbs and action words from end (Hindi/Hinglish SOV suffixes)
  cleaned = cleaned.replace(/\s*(?:gana|gaana|song|video|playlist|track|series)?\s*(?:chala\s*do|chalao|play\s*karo|play\s*kijiye|play\s*kr\s*do|play\s*kar\s*do|play|khol\s*kar\s*dikhao|khol\s*ke\s*dikhao|khol\s*k\s*dikhao|khol\s*kar|dikhao|dikhaye|sunao|bajao|search\s*karo|search\s*kijiye|search|dhoondo|dhundho|khojo|batao|bataiye)\s*$/gi, ' ');

  // 4. Remove qualitative adjectives and qualifiers (e.g. "ki achhi", "best", "top", "ek", "koi")
  cleaned = cleaned.replace(/\b(?:ki\s+)?(?:achhi|achi|best|top|popular|latest)\s+(?:series|playlist|video|song|gana|gaana)?\s*/gi, ' ');
  cleaned = cleaned.replace(/\b(?:ek|koi|kisi)\s+(?:achhi|achi|best|top)?\s*/gi, ' ');

  // 5. Remove connector and filler tokens at start / end
  cleaned = cleaned.replace(/^(?:meri|mera|ye|yeh|the|a|an|ki|ke|ka|aur|and|ek|playlist|video|song)\s+/gi, ' ');
  cleaned = cleaned.replace(/\s+(?:ki|ke|ka|wali|wale|wala|ko|se|me|aur|and|ek|playlist|video|song)$/gi, ' ');
  cleaned = cleaned.replace(/^(?:gana|gaana|song|video|playlist|track|series)\s+/gi, ' ');
  cleaned = cleaned.replace(/\s+(?:gana|gaana|song|video|playlist|track|series)$/gi, ' ');

  // 6. Clean punctuation and excess whitespace
  cleaned = cleaned.replace(/^[,\s:;!?-]+|[,\s:;!?-]+$/g, '').replace(/\s+/g, ' ').trim();

  // If extraction yielded a non-empty authentic target
  if (cleaned.length >= 2) {
    return cleaned;
  }

  // Return empty string if only command/filler tokens were provided
  return '';
}

/**
 * Resolves the target query with context awareness.
 * ONLY carries over previous context if the current query has no entity of its own (anaphora).
 * Never lets previous unrelated context override an authentic current query.
 */
export function resolveTargetQuery(goal: string, context?: TaskContext): string {
  const extracted = extractTargetEntity(goal);

  // Check if extracted query is purely anaphoric (referential pronoun)
  const isAnaphoric =
    !extracted ||
    /^(?:ab|aab|now|then|phir|ise|isse|ishe|isko|ye|yeh|it|this|them|same|that|wo|woh|usko|use|ek|playlist|video|song|gana|series)$/i.test(extracted.trim());

  if (isAnaphoric && context?.previousQueries && context.previousQueries.length > 0) {
    const lastQuery = context.previousQueries[context.previousQueries.length - 1];
    const lastExtracted = extractTargetEntity(lastQuery);
    if (lastExtracted && !/^(?:ab|now|ise|isse|it|this)$/i.test(lastExtracted)) {
      return lastExtracted;
    }
  }

  return extracted;
}
