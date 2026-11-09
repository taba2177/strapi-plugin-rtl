export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.get',
      config: {
        // Public on purpose: the response holds only display options (switches,
        // language codes, field names, a font) and the panel needs it before
        // sign-in, so the login page gets the right direction too. A 401 here
        // would also make Strapi's fetch client try to refresh the session.
        auth: false,
        policies: [],
      },
    },
  ],
};
