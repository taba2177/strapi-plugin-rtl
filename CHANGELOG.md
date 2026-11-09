# Changelog

## 1.0.1

- Fix: centred dialogs and popovers slid off-screen in an RTL interface. Strapi centres them with `left: 50%` and `transform: translate(-50%, …)`; when `left` is mirrored to `right`, the horizontal translate is now mirrored with it (`translate(50%, …)`).
- Fix: style rules added after a view finished rendering (e.g. table cells on Settings → Plugins) could stay unmirrored until the next page change. New rules are now detected when they are inserted.
- The plugin's name and description on Settings → Plugins are translated (English, Arabic).

## 1.0.0

First release.

- Mirrored admin panel (`dir="rtl"`) for RTL interface languages.
- Runtime mirroring of Strapi's physical left/right styles.
- RTL text fields, Markdown and Blocks editors for RTL content locales.
- Technical fields (slug, URL, email, phone, code, JSON…) and code editors stay LTR.
- LTR content (e.g. English) edited in an RTL interface gets left-to-right fields.
- `data-rtl-ignore` attribute to keep an element left-to-right; `<pre>` and `<code>` stay left-to-right.
- Settings page with the detected direction and the active configuration.
- Configuration through `config/plugins` with validation.
- English and Arabic plugin translations.
