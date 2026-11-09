import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  contentLocaleFromSearch,
  isRtlLanguage,
  ltrFieldSelectors,
  mirrorDeclarations,
  type StyleLike,
} from '../admin/src/rtl/core.ts';

/** Minimal CSSStyleDeclaration stand-in. */
const style = (decls: Record<string, string>, important: string[] = []): StyleLike => ({
  getPropertyValue: (p) => decls[p] ?? '',
  getPropertyPriority: (p) => (important.includes(p) ? 'important' : ''),
});

test('detects RTL languages by base code', () => {
  const list = DEFAULT_SETTINGS.rtlLocales;
  for (const code of ['ar', 'ar-SA', 'AR', 'he', 'fa_IR', 'ur', 'ckb']) assert.equal(isRtlLanguage(code, list), true, code);
  for (const code of ['en', 'fr-FR', 'tr', '', null, undefined]) assert.equal(isRtlLanguage(code, list), false, String(code));
});

test('custom RTL list replaces the default', () => {
  assert.equal(isRtlLanguage('ar', ['he']), false);
  assert.equal(isRtlLanguage('he-IL', ['he']), true);
});

test('reads the content locale from the admin URL', () => {
  assert.equal(contentLocaleFromSearch('?plugins[i18n][locale]=ar&page=1'), 'ar');
  assert.equal(contentLocaleFromSearch('?plugins%5Bi18n%5D%5Blocale%5D=he'), 'he');
  assert.equal(contentLocaleFromSearch(''), '');
});

test('LTR selectors include built-ins and extras, without over-broad fragments', () => {
  const sel = ltrFieldSelectors(['sku', ' ']);
  assert.ok(sel.includes('[type="email"]'));
  assert.ok(sel.includes('[name*="slug" i]'));
  assert.ok(sel.includes('[name*="sku" i]'));
  assert.ok(!sel.some((s) => s === '[name*=" " i]' || s === '[name*="" i]'));
  // "ip" or "uid" would make description / guide fields LTR
  assert.ok(!sel.includes('[name*="ip" i]'));
  assert.ok(!sel.includes('[name*="uid" i]'));
});

test('swaps one-sided physical padding', () => {
  const m = mirrorDeclarations(style({ 'padding-left': 'calc(1 * 24px + 12px)' }));
  assert.deepEqual(m?.rtl['padding-right'], ['calc(1 * 24px + 12px)', '']);
  assert.deepEqual(m?.rtl['padding-left'], ['', '']);
  assert.deepEqual(m?.ltr['padding-left'], ['calc(1 * 24px + 12px)', '']);
});

test('keeps priorities and swaps both sides', () => {
  const m = mirrorDeclarations(style({ 'margin-left': '4px', 'margin-right': '8px' }, ['margin-right']));
  assert.deepEqual(m?.rtl['margin-left'], ['8px', 'important']);
  assert.deepEqual(m?.rtl['margin-right'], ['4px', '']);
});

test('flips left/right keywords and corner radii', () => {
  const m = mirrorDeclarations(style({ 'text-align': 'left', float: 'right', 'border-top-left-radius': '4px' }));
  assert.deepEqual(m?.rtl['text-align'], ['right', '']);
  assert.deepEqual(m?.rtl.float, ['left', '']);
  assert.deepEqual(m?.rtl['border-top-right-radius'], ['4px', '']);
});

test('ignores symmetric and non-directional rules', () => {
  assert.equal(mirrorDeclarations(style({ 'padding-left': '8px', 'padding-right': '8px' })), null);
  assert.equal(mirrorDeclarations(style({ color: 'red', 'text-align': 'center' })), null);
});
