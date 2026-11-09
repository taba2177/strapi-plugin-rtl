/**
 * Plugin configuration (config/plugins.{js,ts} → `rtl: { config: { … } }`).
 * Every option is optional; the defaults suit most projects.
 */
export interface RtlConfig {
  /** Mirror the whole admin panel when the interface language is RTL. */
  interface: boolean;
  /** Edit fields right-to-left when the content locale (i18n) is RTL. */
  content: boolean;
  /** Swap Strapi's physical left/right styles (padding, margin, borders…) in an RTL interface. */
  mirrorStyles: boolean;
  /** Language codes treated as RTL (matched on the base code: "ar" covers "ar-SA"). */
  rtlLocales: string[];
  /** Extra field-name fragments that always stay LTR (slug, URL, email… are built in). */
  ltrFields: string[];
  /** Extra texts of "back" links whose arrow icon should be mirrored. */
  backLabels: string[];
  /** Optional font stack for an RTL interface, e.g. "'Noto Sans Arabic', sans-serif". */
  fontFamily: string | null;
}

export const DEFAULT_RTL_LOCALES = ['ar', 'arc', 'ckb', 'dv', 'fa', 'ha', 'he', 'khw', 'ks', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi'];

const defaults: RtlConfig = {
  interface: true,
  content: true,
  mirrorStyles: true,
  rtlLocales: DEFAULT_RTL_LOCALES,
  ltrFields: [],
  backLabels: [],
  fontFamily: null,
};

const isStringList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim() !== '');

export default {
  default: defaults,
  validator(config: Partial<RtlConfig>) {
    for (const key of ['interface', 'content', 'mirrorStyles'] as const) {
      if (config[key] !== undefined && typeof config[key] !== 'boolean') {
        throw new Error(`[rtl] "${key}" must be a boolean`);
      }
    }
    for (const key of ['rtlLocales', 'ltrFields', 'backLabels'] as const) {
      if (config[key] !== undefined && !isStringList(config[key])) {
        throw new Error(`[rtl] "${key}" must be an array of non-empty strings`);
      }
    }
    if (config.fontFamily != null && typeof config.fontFamily !== 'string') {
      throw new Error('[rtl] "fontFamily" must be a string or null');
    }
  },
};
