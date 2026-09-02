import { describe, expect, it } from 'vitest';
import { translations } from '../lib/i18n';

describe('translation catalogs', () => {
  it('keeps English and Vietnamese keys in exact parity', () => {
    expect(Object.keys(translations.vi).sort()).toEqual(Object.keys(translations.en).sort());
  });

  it('does not contain empty translated values', () => {
    for (const [language, catalog] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim(), `${language}.${key}`).not.toBe('');
      }
    }
  });
});
