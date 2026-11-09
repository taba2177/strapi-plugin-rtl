/**
 * Right-to-left support for the Strapi 5 admin panel.
 *
 * Strapi ships RTL interface translations (Arabic, Hebrew, Persian…) but never
 * switches the page direction, and its design system uses physical left/right
 * styles. This engine:
 *
 *  1. Interface: when the admin language is RTL, sets <html dir="rtl"> and
 *     mirrors Strapi's left/right styles (see mirrorStyles).
 *  2. Content: when the edited locale (i18n) is RTL, text fields and the
 *     Markdown editor become RTL. Technical fields (slug, URL, email, phone,
 *     code…) stay LTR, and `unicode-bidi: plaintext` lets every line follow its
 *     own script, so Latin text inside an RTL entry still reads correctly.
 *     The other way round, LTR content (English…) edited in an RTL interface
 *     gets LTR fields.
 *  3. Code editors (JSON, code blocks) always stay LTR.
 */
import {
  BUILTIN_BACK_LABELS,
  DEFAULT_SETTINGS,
  KEEP_LTR_SELECTOR,
  contentLocaleFromSearch,
  isRtlLanguage,
  ltrFieldSelectors,
  mirrorDeclarations,
  type Declarations,
  type RtlSettings,
} from './core';

const STYLE_ID = 'strapi-plugin-rtl';
const UI = 'rtl-ui';
const CONTENT = 'rtl-content';
/** LTR content (e.g. English) edited in an RTL interface. */
const LTR_CONTENT = 'ltr-content';

let settings: RtlSettings = DEFAULT_SETTINGS;
let installed = false;

// ---------------------------------------------------------------- CSS

function buildCss(s: RtlSettings): string {
  const ltr = ltrFieldSelectors(s.ltrFields);
  const notLtr = ltr.map((sel) => `:not(${sel})`).join('');
  const list = (prefix: string) => ltr.map((sel) => `${prefix}${sel}`).join(',\n');
  return `
/* ---------- RTL content: fields of an RTL locale ---------- */
html.${CONTENT} main input[type="text"]${notLtr},
html.${CONTENT} main input:not([type])${notLtr},
html.${CONTENT} main textarea${notLtr} {
  direction: rtl;
  text-align: right;
  unicode-bidi: plaintext;
}
${list(`html.${CONTENT} main input`)} {
  direction: ltr;
  text-align: left;
}
/* Markdown editor (CodeMirror 5 lines) + previews */
html.${CONTENT} main .CodeMirror pre.CodeMirror-line,
html.${CONTENT} main .CodeMirror pre.CodeMirror-placeholder,
html.${CONTENT} main [class*="preview" i] {
  direction: rtl;
  text-align: right;
  unicode-bidi: plaintext;
}
/* Blocks editor */
html.${CONTENT} main [contenteditable="true"] {
  unicode-bidi: plaintext;
  text-align: start;
}
/* list view: RTL titles in table cells */
html.${CONTENT} main table td span,
html.${CONTENT} main [role="gridcell"] span {
  unicode-bidi: plaintext;
}

/* ---------- LTR content in an RTL interface: fields follow the content ---------- */
html.${LTR_CONTENT} main input[type="text"],
html.${LTR_CONTENT} main input:not([type]),
html.${LTR_CONTENT} main textarea,
html.${LTR_CONTENT} main .CodeMirror pre.CodeMirror-line,
html.${LTR_CONTENT} main .CodeMirror pre.CodeMirror-placeholder {
  direction: ltr;
  text-align: left;
  unicode-bidi: plaintext;
}

/* ---------- RTL interface ---------- */
${s.fontFamily ? `html.${UI} body { font-family: ${s.fontFamily}; }` : ''}
/* Radix primitives (scroll areas, menus, selects) render dir="ltr" without a
   DirectionProvider, which pins whole views to LTR. */
html.${UI} [dir="ltr"]:not(input):not(textarea):not(pre):not(code):not([data-rtl-ignore]):not([data-rtl-ignore] *) {
  direction: rtl;
}
/* opt-out for other plugins and custom fields: <div data-rtl-ignore> stays LTR */
html.${UI} [data-rtl-ignore], html.${UI} pre, html.${UI} code {
  direction: ltr;
  text-align: left;
}
html.${UI} label {
  text-align: right;
}
html.${UI} .${STYLE_ID}-flip {
  transform: scaleX(-1);
}
${list(`html.${UI} main input`)} {
  direction: ltr;
  text-align: left;
}

/* ---------- code editors are code: always LTR ---------- */
html.${UI} .cm-editor, html.${UI} .cm-editor *,
html.${CONTENT} main .cm-editor, html.${CONTENT} main .cm-editor * {
  direction: ltr !important;
  text-align: left;
  unicode-bidi: normal;
}
`;
}

function injectCss() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildCss(settings);
}

// ---------------------------------------------------------------- style mirroring

/**
 * Strapi's design system writes physical styles (`padding-left`, `left: 0`…)
 * through styled-components with generated class names, so `dir="rtl"` alone
 * does not flip them. Like rtlcss, but at runtime: in an RTL interface every
 * rule's left/right values are swapped *inside the rule itself*, so cascade
 * and specificity stay exactly as Strapi designed them; an LTR interface gets
 * the original values back.
 */
const mirrored = new WeakMap<CSSStyleRule, { ltr: Declarations; rtl: Declarations } | null>();
const sheetSizes = new WeakMap<CSSStyleSheet, number>();
let mirroring = false;

function apply(style: CSSStyleDeclaration, decls: Declarations) {
  for (const [prop, [value, priority]] of Object.entries(decls)) {
    if (value) style.setProperty(prop, value, priority);
    else style.removeProperty(prop);
  }
}

function eachStyleRule(rules: CSSRuleList, fn: (rule: CSSStyleRule) => void) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (!KEEP_LTR_SELECTOR.test(rule.selectorText)) fn(rule);
    } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      eachStyleRule((rule as CSSGroupingRule).cssRules, fn); // @media / @supports
    }
  }
}

function mirrorStyles(force = false) {
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.id === STYLE_ID) continue; // ours is written for both directions
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules; // cross-origin sheets throw
    } catch {
      continue;
    }
    if (!force && sheetSizes.get(sheet) === rules.length) continue;
    sheetSizes.set(sheet, rules.length);
    eachStyleRule(rules, (rule) => {
      let entry = mirrored.get(rule);
      if (entry === undefined) {
        entry = mirrorDeclarations(rule.style);
        mirrored.set(rule, entry);
        if (entry && mirroring) apply(rule.style, entry.rtl);
      } else if (entry && force) {
        apply(rule.style, mirroring ? entry.rtl : entry.ltr);
      }
    });
  }
}

function setMirroring(on: boolean) {
  if (on === mirroring) return;
  mirroring = on;
  mirrorStyles(true);
}

// ---------------------------------------------------------------- icons

/** Strapi icons carry no names: mark the arrow of "Back" links for mirroring. */
function flipBackIcons() {
  if (!document.documentElement.classList.contains(UI)) return;
  const labels = new Set([...BUILTIN_BACK_LABELS, ...settings.backLabels]);
  for (const link of Array.from(document.querySelectorAll('a, button'))) {
    const icon = link.firstElementChild;
    if (icon?.tagName.toLowerCase() === 'svg' && !icon.classList.contains(`${STYLE_ID}-flip`) && labels.has(link.textContent?.trim() ?? '')) {
      icon.classList.add(`${STYLE_ID}-flip`);
    }
  }
}

// ---------------------------------------------------------------- state

export interface RtlState {
  interfaceLanguage: string;
  interfaceRtl: boolean;
  contentLocale: string;
  contentRtl: boolean;
  settings: RtlSettings;
}

const listeners = new Set<(state: RtlState) => void>();

export function getState(): RtlState {
  const html = document.documentElement;
  const interfaceLanguage = html.getAttribute('lang') || '';
  const contentLocale = contentLocaleFromSearch(window.location.search);
  return {
    interfaceLanguage,
    interfaceRtl: settings.interface && isRtlLanguage(interfaceLanguage, settings.rtlLocales),
    contentLocale,
    contentRtl: settings.content && isRtlLanguage(contentLocale, settings.rtlLocales),
    settings,
  };
}

export function subscribe(fn: (state: RtlState) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function sync() {
  const html = document.documentElement;
  const state = getState();
  html.classList.toggle(UI, state.interfaceRtl);
  html.classList.toggle(CONTENT, state.contentRtl);
  html.classList.toggle(LTR_CONTENT, state.interfaceRtl && settings.content && !!state.contentLocale && !state.contentRtl);
  const dir = state.interfaceRtl ? 'rtl' : 'ltr';
  if (html.getAttribute('dir') !== dir) html.setAttribute('dir', dir);
  setMirroring(state.interfaceRtl && settings.mirrorStyles);
  listeners.forEach((fn) => fn(state));
}

let scheduled = false;
function scheduleScan() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    if (mirroring) mirrorStyles();
    flipBackIcons();
  });
}

// ---------------------------------------------------------------- public API

/** Start the engine (idempotent). */
export function install(initial: Partial<RtlSettings> = {}) {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  settings = { ...DEFAULT_SETTINGS, ...initial };
  injectCss();

  // The admin is a single-page app: re-check on every navigation…
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method];
    window.history[method] = function patched(this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args);
      queueMicrotask(sync);
      return result;
    };
  }
  window.addEventListener('popstate', sync);
  // …and when the interface language changes (Strapi updates <html lang>).
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // New views add new style rules and "Back" links (batched to one pass per frame).
  new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });

  sync();
  scheduleScan();
}

/** Apply settings loaded from the server (config/plugins → rtl.config). */
export function configure(next: Partial<RtlSettings>) {
  settings = { ...settings, ...next };
  if (!installed) return;
  injectCss();
  sync();
  if (mirroring) mirrorStyles(true);
}
