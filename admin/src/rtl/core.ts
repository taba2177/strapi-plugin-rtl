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
