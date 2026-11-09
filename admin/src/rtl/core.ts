/**
 * Pure helpers (no DOM globals) — unit-tested in test/core.test.ts.
 */

export interface RtlSettings {
  interface: boolean;
  content: boolean;
  mirrorStyles: boolean;
  rtlLocales: string[];
  ltrFields: string[];
  backLabels: string[];
  fontFamily: string | null;
}

export const DEFAULT_SETTINGS: RtlSettings = {
  interface: true,
  content: true,
  mirrorStyles: true,
  rtlLocales: ['ar', 'arc', 'ckb', 'dv', 'fa', 'ha', 'he', 'khw', 'ks', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi'],
  ltrFields: [],
  backLabels: [],
  fontFamily: null,
};

/** "ar", "ar-SA", "fa_IR" → RTL when the base language is in the list. */
export function isRtlLanguage(code: string | null | undefined, rtlLocales: string[]): boolean {
  if (!code) return false;
  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  return rtlLocales.some((l) => l.toLowerCase() === base || l.toLowerCase() === code.toLowerCase());
}

/** Content locale of the edit / list view (`?plugins[i18n][locale]=ar`). */
export function contentLocaleFromSearch(search: string): string {
  return new URLSearchParams(search).get('plugins[i18n][locale]') || '';
}

/** Fields whose values are always Latin / technical. */
export const BUILTIN_LTR_TYPES = ['email', 'url', 'number', 'password', 'tel'];
export const BUILTIN_LTR_NAMES = ['slug', 'url', 'link', 'href', 'anchor', 'email', 'phone', 'whatsapp', 'code', 'domain', 'regex', 'json', 'canonical', 'robots', 'viewport'];

/** CSS selectors (no element prefix) for inputs that stay LTR. */
export function ltrFieldSelectors(extraNames: string[] = []): string[] {
  const names = [...new Set([...BUILTIN_LTR_NAMES, ...extraNames.map((n) => n.trim()).filter(Boolean)])];
  return [
    ...BUILTIN_LTR_TYPES.map((t) => `[type="${t}"]`),
    ...names.map((n) => `[name*="${n.replace(/"/g, '\\"')}" i]`),
  ];
}

/** "Back" link texts in Strapi's languages; their arrow icon is mirrored. */
export const BUILTIN_BACK_LABELS = ['Back', 'رجوع', 'الى الوراء', 'العودة', 'חזרה', 'חזור', 'بازگشت', 'برگشت', 'واپس'];

// ---------------------------------------------------------------- style mirroring

export const SWAP_PAIRS: [string, string][] = [
  ['padding-left', 'padding-right'],
  ['margin-left', 'margin-right'],
  ['left', 'right'],
  ['border-left-width', 'border-right-width'],
  ['border-left-style', 'border-right-style'],
  ['border-left-color', 'border-right-color'],
  ['border-top-left-radius', 'border-top-right-radius'],
  ['border-bottom-left-radius', 'border-bottom-right-radius'],
];
export const SWAP_KEYWORD_PROPS = ['text-align', 'float', 'clear'];

/** Selectors whose styles must not be mirrored (code editors stay LTR). */
export const KEEP_LTR_SELECTOR = /\.cm-|ͼ|CodeMirror|monaco/;

export type Declarations = Record<string, [value: string, priority: string]>;

export interface StyleLike {
  getPropertyValue(prop: string): string;
  getPropertyPriority(prop: string): string;
}

/** -50% → 50%, 12px → -12px, 0 → 0, calc(…) → calc(-1 * (…)). */
export function negateLength(v: string): string {
  const t = v.trim();
  if (/^-?0(\.0+)?([a-z%]+)?$/i.test(t)) return t;
  if (t.startsWith('-')) return t.slice(1);
  if (/^(calc|var|min|max|clamp)\(/i.test(t)) return `calc(-1 * ${t})`;
  return `-${t}`;
}

/** Split a CSS function's arguments on top-level commas (calc() may contain commas). */
function splitArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of args) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((a) => a.trim());
}

/**
 * Mirror the horizontal part of translate functions:
 * translate(-50%, -50%) → translate(50%, -50%), translateX(8px) → translateX(-8px).
 * Needed with a swapped `left`/`right`: Strapi centres dialogs with
 * `left: 50%; transform: translate(-50%, -50%)`, which mirrors to
 * `right: 50%; transform: translate(50%, -50%)`.
 */
export function mirrorTranslate(transform: string): string {
  return transform.replace(/\b(translate3d|translateX|translate)\(((?:[^()]|\([^()]*\))*)\)/gi, (whole, fn: string, args: string) => {
    const parts = splitArgs(args);
    if (!parts[0]) return whole;
    parts[0] = negateLength(parts[0]);
    return `${fn}(${parts.join(', ')})`;
  });
}

const flipKeyword = (v: string) => v.replace(/\b(left|right)\b/g, (w) => (w === 'left' ? 'right' : 'left'));

/**
 * The LTR (original) and RTL (mirrored) declarations of a style rule, or null
 * when it has nothing directional. Symmetric pairs are left untouched.
 */
export function mirrorDeclarations(style: StyleLike): { ltr: Declarations; rtl: Declarations } | null {
  const ltr: Declarations = {};
  const rtl: Declarations = {};
  let changed = false;
  for (const [a, b] of SWAP_PAIRS) {
    const va = style.getPropertyValue(a);
    const vb = style.getPropertyValue(b);
    const pa = style.getPropertyPriority(a);
    const pb = style.getPropertyPriority(b);
    if (!va && !vb) continue;
    if (va === vb && pa === pb) continue;
    changed = true;
    ltr[a] = [va, pa];
    ltr[b] = [vb, pb];
    rtl[a] = [vb, pb];
    rtl[b] = [va, pa];
  }
  // a swapped left/right offset takes the horizontal translate with it (centred dialogs, popovers)
  if (ltr.left || ltr.right) {
    const t = style.getPropertyValue('transform');
    const mirroredT = t ? mirrorTranslate(t) : t;
    if (t && mirroredT !== t) {
      const p = style.getPropertyPriority('transform');
      ltr.transform = [t, p];
      rtl.transform = [mirroredT, p];
    }
  }
  for (const prop of SWAP_KEYWORD_PROPS) {
    const v = style.getPropertyValue(prop);
    if (!/\b(left|right)\b/.test(v)) continue;
    changed = true;
    const p = style.getPropertyPriority(prop);
    ltr[prop] = [v, p];
    rtl[prop] = [flipKeyword(v), p];
  }
  return changed ? { ltr, rtl } : null;
}
