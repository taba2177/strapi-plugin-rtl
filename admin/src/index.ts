import { getFetchClient } from '@strapi/strapi/admin';
import type { StrapiApp } from '@strapi/strapi/admin';

import { PLUGIN_ID } from './pluginId';
import { configure, install, subscribe } from './rtl/engine';
import type { RtlSettings } from './rtl/core';
import { getTranslation } from './utils/getTranslation';

let loaded = false;
let loading = false;

/** Settings come from config/plugins (server); public endpoint, retried on navigation if the server was unreachable. */
async function loadSettings() {
  if (loaded || loading) return;
  loading = true;
  try {
    const { get } = getFetchClient();
    const { data } = await get<{ data: RtlSettings }>(`/${PLUGIN_ID}/settings`);
    configure(data.data);
    loaded = true;
  } catch {
    // server restarting — the defaults stay active and the next navigation retries
  } finally {
    loading = false;
  }
}

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });

    app.addSettingsLink('global', {
      id: PLUGIN_ID,
      to: PLUGIN_ID,
      intlLabel: { id: getTranslation('settings.link'), defaultMessage: 'RTL support' },
      Component: () => import('./pages/SettingsPage'),
      permissions: [],
    });
  },

  bootstrap() {
    // Defaults right away (no LTR flash), then the project's configuration.
    install();
    loadSettings();
    subscribe(() => loadSettings());
  },

  registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as {
            default: Record<string, string>;
          };
          const prefixed: Record<string, string> = {};
          for (const key of Object.keys(data)) prefixed[getTranslation(key)] = data[key];
          // name and description on Settings → Plugins
          if (data['plugin.name']) prefixed[`global.plugins.${PLUGIN_ID}`] = data['plugin.name'];
          if (data['plugin.description']) prefixed[`global.plugins.${PLUGIN_ID}.description`] = data['plugin.description'];
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      }),
    );
  },
};

export default plugin;
