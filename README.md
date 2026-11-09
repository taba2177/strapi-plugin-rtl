# Strapi Plugin RTL

Right-to-left (RTL) support for the **Strapi 5** admin panel.

Strapi ships translations for RTL languages such as Arabic, Hebrew and Persian, but the admin panel stays left-to-right: the layout is not mirrored, menus are indented from the wrong side, and Arabic or Hebrew content is typed into left-aligned fields. This plugin fixes that with no changes to your project code.

## Features

- **Mirrored interface.** When an admin chooses an RTL interface language (Profile → Interface language), the whole panel switches to `dir="rtl"`.
- **Correct spacing.** Strapi's design system uses physical styles (`padding-left`, `margin-right`, `left: 0`…) that `dir="rtl"` does not flip. The plugin swaps left and right inside Strapi's own style rules at runtime, so menu indents, cards, inputs and icons sit on the correct side. Switching back to an LTR language restores the original styles.
- **RTL content editing.** When you edit an RTL locale (for example `ar` with the Internationalization plugin), text fields, text areas, the Markdown editor and the Blocks editor become RTL, even if the interface language is English.
- **Technical fields stay LTR.** Slugs, URLs, emails, phone numbers, code and JSON fields keep left-to-right input. You can add your own field names.
- **Mixed text reads correctly.** Each line follows its own script (`unicode-bidi: plaintext`), so an English brand name inside an Arabic paragraph is not scrambled.
- **Code editors stay LTR.** JSON and code fields are never mirrored.
- **Settings page** (Settings → RTL support) that shows the detected direction of the interface and the content, and the active configuration.
- No content-type changes, no database changes, no dependencies beyond Strapi itself.

Supported RTL languages by default: Arabic (`ar`), Aramaic (`arc`), Central Kurdish (`ckb`), Dhivehi (`dv`), Persian (`fa`), Hausa (`ha`), Hebrew (`he`), Khowar (`khw`), Kashmiri (`ks`), Kurdish (`ku`), Pashto (`ps`), Sindhi (`sd`), Uyghur (`ug`), Urdu (`ur`) and Yiddish (`yi`). Regional codes such as `ar-SA` or `fa-IR` are matched by their base language.

## Requirements

- Strapi 5 (`@strapi/strapi` ^5.0.0)
- Node.js 20 or later

## Installation

```bash
npm install strapi-plugin-rtl
# or
yarn add strapi-plugin-rtl
```

Rebuild the admin panel and restart Strapi:

```bash
npm run build
npm run develop
```

The plugin is enabled automatically. To let your editors use an RTL interface, add the language to the admin panel in `src/admin/app.js` (or `app.tsx`):

```js
export default {
  config: {
    locales: ['ar'], // 'he', 'fa', …
  },
};
```

Each admin then picks the language in **Profile → Interface language**.

## Configuration

Everything is optional. Add a `rtl` entry to `config/plugins.js` (or `config/plugins.ts`) only to change the defaults:

```js
module.exports = ({ env }) => ({
  rtl: {
    enabled: true,
    config: {
      // Mirror the admin panel when the interface language is RTL.
      interface: true,

      // Make text fields RTL when editing an RTL content locale.
      content: true,

      // Swap Strapi's left/right styles in an RTL interface.
      mirrorStyles: true,

      // Languages treated as RTL. Replaces the default list.
      rtlLocales: ['ar', 'he', 'fa', 'ur'],

      // Extra field names that always stay left-to-right
      // (matched as part of the field name, case-insensitive).
      ltrFields: ['sku', 'isbn'],

      // Extra texts of "back" links whose arrow should point the other way.
      backLabels: [],

      // Font stack for the RTL interface (load the font yourself).
      fontFamily: "'Noto Sans Arabic', sans-serif",
    },
  },
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `interface` | `boolean` | `true` | Mirror the admin panel when the interface language is RTL. |
| `content` | `boolean` | `true` | RTL text fields when the edited locale is RTL. |
| `mirrorStyles` | `boolean` | `true` | Swap Strapi's physical left/right styles in an RTL interface. |
| `rtlLocales` | `string[]` | 15 RTL languages | Language codes treated as RTL. |
| `ltrFields` | `string[]` | `[]` | Extra field-name fragments that stay LTR. |
| `backLabels` | `string[]` | `[]` | Extra "back" link texts whose arrow is mirrored. |
| `fontFamily` | `string \| null` | `null` | Font stack for the RTL interface. |

Fields that always stay LTR: input types `email`, `url`, `number`, `password`, `tel`, and names containing `slug`, `url`, `link`, `href`, `anchor`, `email`, `phone`, `whatsapp`, `code`, `domain`, `regex`, `json`, `canonical`, `robots`, `viewport`.

Invalid options stop Strapi at startup with a clear message, for example `[rtl] "rtlLocales" must be an array of non-empty strings`.

## Keeping an element left-to-right

Plugin and custom-field authors can opt an element (and everything inside it) out of RTL with the `data-rtl-ignore` attribute:

```jsx
<div data-rtl-ignore>
  {/* stays left-to-right in an RTL interface */}
</div>
```

`<pre>` and `<code>` elements, code editors and technical inputs are left-to-right automatically.

## How it works

The plugin runs only in the admin panel and does not change your API or your content.

1. It watches the interface language (`<html lang>`, set by Strapi) and the content locale in the URL (`?plugins[i18n][locale]=…`).
2. For an RTL interface it sets `<html dir="rtl">`, adds a small stylesheet, and mirrors Strapi's own style rules: for each rule it swaps `padding-left` ↔ `padding-right`, `margin-*`, `left` ↔ `right`, border sides, corner radii and `text-align` / `float` values. The swap happens inside the original rule, so CSS specificity and order are unchanged. Rules added later (new screens) are mirrored as they appear.
3. For an RTL content locale it makes text inputs RTL, except technical fields.

The admin panel reads the configuration from `GET /rtl/settings`. The endpoint is public because it returns only display options (switches, language codes, field names and a font, never secrets) and the login page needs it before sign-in. Until it loads, the defaults apply, so the panel never flashes left-to-right.

## Known limitations

- Plugins that hard-code `direction: ltr` or inline left/right styles are not changed.
- Icons are not named in Strapi's markup, so only the arrows of "Back" links are mirrored automatically. Add your language's "Back" text to `backLabels` if it is not built in.
- Strapi's own Arabic, Hebrew and Persian interface translations are incomplete; untranslated texts still show in English. This plugin does not add translations for Strapi itself.

## Development

```bash
git clone https://github.com/taba2177/strapi-plugin-rtl.git
cd strapi-plugin-rtl
npm install
npm test          # unit tests
npm run build     # build dist/
npm run verify    # check the package before publishing
```

To try it in a Strapi project, follow [Strapi's plugin development guide](https://docs.strapi.io/cms/plugins-development/create-a-plugin):

```bash
# in the plugin
npm run watch:link
# in your Strapi project
npx yalc add --link strapi-plugin-rtl && npm install
npm run develop
```

## Contributing

Issues and pull requests are welcome. Screenshots help a lot for layout problems: please include the interface language and the page.

## License

[MIT](./LICENSE)
