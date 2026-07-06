import { describe, expect, it } from 'vitest';
import { parseTeacherVocabularyCsv } from '../../src/lib/importTeacherVocabularyCsv';

describe('parseTeacherVocabularyCsv', () => {
  it('parses CSV export rows and counts skipped rows', () => {
    const source = [
      'word,phonetic,vietnamese_meaning,difficulty',
      'coherent,/kəʊˈhɪərənt/,mạch lạc,medium',
      ',,/missing/,easy',
      'meticulous,/məˈtɪkjələs/,tỉ mỉ,hard',
    ].join('\n');

    const preview = parseTeacherVocabularyCsv('teacher-import.csv', source);

    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(2);
    expect(preview.skippedRows).toBe(1);
    expect(preview.rows[0]).toMatchObject({
      word: 'coherent',
      vietnamese_meaning: 'mạch lạc',
      difficulty: 'medium',
    });
  });

  it('rejects files missing the word column', () => {
    const source = ['meaning,difficulty', 'mạch lạc,medium'].join('\n');

    expect(() => parseTeacherVocabularyCsv('teacher-import.csv', source)).toThrow('File CSV cần có cột word.');
  });
});
