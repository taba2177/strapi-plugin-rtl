import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  contentLocaleFromSearch,
  isRtlLanguage,
  ltrFieldSelectors,
  mirrorDeclarations,
  mirrorTranslate,
  negateLength,
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

test('centred dialog: left 50% + translate(-50%) mirrors to right 50% + translate(50%)', () => {
  const m = mirrorDeclarations(style({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }));
  assert.deepEqual(m?.rtl.right, ['50%', '']);
  assert.deepEqual(m?.rtl.left, ['', '']);
  assert.deepEqual(m?.rtl.transform, ['translate(50%, -50%)', '']);
  assert.deepEqual(m?.ltr.transform, ['translate(-50%, -50%)', '']);
});

test('transforms are only touched when left/right is swapped', () => {
  assert.equal(mirrorDeclarations(style({ transform: 'translateX(-8px)' })), null);
  const m = mirrorDeclarations(style({ 'padding-left': '4px', transform: 'translateX(-8px)' }));
  assert.equal(m?.rtl.transform, undefined);
});

test('negates translate lengths of every form', () => {
  assert.equal(negateLength('-50%'), '50%');
  assert.equal(negateLength('12px'), '-12px');
  assert.equal(negateLength('0'), '0');
  assert.equal(negateLength('0px'), '0px');
  assert.equal(negateLength('calc(100% - 4px)'), 'calc(-1 * calc(100% - 4px))');
  assert.equal(mirrorTranslate('translateX(-100%) rotate(45deg)'), 'translateX(100%) rotate(45deg)');
  assert.equal(mirrorTranslate('translate3d(10px, 0, 0)'), 'translate3d(-10px, 0, 0)');
  assert.equal(mirrorTranslate('translateY(-50%)'), 'translateY(-50%)');
  assert.equal(mirrorTranslate('translate(calc(-50% + 2px), -50%)'), 'translate(calc(-1 * calc(-50% + 2px)), -50%)');
});
