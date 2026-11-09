import type { Core } from '@strapi/strapi';

const settings = ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(ctx) {
    ctx.body = { data: strapi.plugin('rtl').service('settings').get() };
  },
});

export default { settings };
