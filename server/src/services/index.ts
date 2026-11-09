import type { Core } from '@strapi/strapi';
import type { RtlConfig } from '../config';

const settings = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** The resolved configuration the admin panel needs (no secrets live here). */
  get(): RtlConfig {
    const config = strapi.config.get('plugin::rtl') as RtlConfig;
    return {
      interface: config.interface,
      content: config.content,
      mirrorStyles: config.mirrorStyles,
      rtlLocales: [...new Set(config.rtlLocales.map((code) => code.toLowerCase()))],
      ltrFields: config.ltrFields,
      backLabels: config.backLabels,
      fontFamily: config.fontFamily,
    };
  },
});

export default { settings };
