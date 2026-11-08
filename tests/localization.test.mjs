import { readFile } from 'node:fs/promises';
import { createTranslator } from 'next-intl';
import { expect, test } from 'vitest';

const locales = ['en', 'pt', 'es'];

function flatten(messages, prefix = '') {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? [[path, value]]
      : flatten(value, path);
  });
}

test('translation catalogs have matching keys and valid messages', async () => {
  const catalogs = await Promise.all(
    locales.map(async (locale) => {
      const content = await readFile(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8');
      return JSON.parse(content);
    })
  );
  const expectedKeys = flatten(catalogs[0]).map(([key]) => key).sort();
  const expectedArguments = new Map(
    flatten(catalogs[0]).map(([key, value]) => [
      key,
      [...value.matchAll(/\{(\w+)\s*(?:,|\})/g)].map((match) => match[1]).sort()
    ])
  );

  for (const [index, messages] of catalogs.entries()) {
    const locale = locales[index];
    const entries = flatten(messages);
    expect(entries.map(([key]) => key).sort(), `${locale} keys`).toEqual(expectedKeys);

    const errors = [];
    const translate = createTranslator({
      locale,
      messages,
      onError: (error) => errors.push(error.message)
    });

    for (const [key, value] of entries) {
      const argumentsUsed = [...value.matchAll(/\{(\w+)\s*(?:,|\})/g)]
        .map((match) => match[1])
        .sort();
      expect(argumentsUsed, `${locale} ${key} arguments`).toEqual(expectedArguments.get(key));
      translate(key, { count: 2, plan: 'Base', interval: 'month', ip: '127.0.0.1' });
    }

    expect(errors, `${locale} message formatting`).toEqual([]);
  }
});
