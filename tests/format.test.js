import { describe, it, expect } from 'vitest';
import {
  computeAge,
  extractYear,
  formatYears,
  formatYearsWithAge,
  parseGedcomDate,
  shortName,
} from '../src/tree/format.js';

describe('extractYear', () => {
  it('берёт год из полной даты GEDCOM', () => {
    expect(extractYear('21 JAN 2013')).toBe('2013');
  });

  it('берёт год из голого года', () => {
    expect(extractYear('1888')).toBe('1888');
  });

  it('null для пустого значения', () => {
    expect(extractYear(null)).toBeNull();
    expect(extractYear('')).toBeNull();
  });
});

describe('formatYears', () => {
  const person = (birth, death) => ({ birth, death });

  it('рождение и смерть', () => {
    expect(formatYears(person({ date: '1888' }, { date: '5 MAY 1950' }))).toBe('1888 – 1950');
  });

  it('только рождение (жив или смерть не записана)', () => {
    expect(formatYears(person({ date: '1888' }, null))).toBe('1888');
  });

  it('умер, дата неизвестна — многоточие', () => {
    expect(formatYears(person({ date: '1888' }, { date: null }))).toBe('1888 – …');
  });

  it('известна только смерть — многоточие вместо рождения', () => {
    expect(formatYears(person(null, { date: '1950' }))).toBe('… – 1950');
  });

  it('умер, но ни одной даты нет — пустая строка', () => {
    expect(formatYears(person(null, { date: null }))).toBe('');
  });

  it('ничего не известно — пустая строка', () => {
    expect(formatYears(person(null, null))).toBe('');
  });
});

describe('parseGedcomDate', () => {
  it('полная дата', () => {
    expect(parseGedcomDate('12 MAY 1954')).toEqual({ year: 1954, month: 5, day: 12 });
  });

  it('месяц и год без дня', () => {
    expect(parseGedcomDate('MAY 1954')).toEqual({ year: 1954, month: 5, day: null });
  });

  it('голый год', () => {
    expect(parseGedcomDate('1954')).toEqual({ year: 1954, month: null, day: null });
  });

  it('приблизительная дата ABT', () => {
    expect(parseGedcomDate('ABT 1888')).toEqual({ year: 1888, month: null, day: null });
  });

  it('null для пустого значения', () => {
    expect(parseGedcomDate(null)).toBeNull();
    expect(parseGedcomDate('')).toBeNull();
  });
});

describe('computeAge', () => {
  const now = new Date(2026, 6, 13); // 13 июля 2026
  const person = (birth, death) => ({ birth, death });

  it('жив: полных лет на сегодня, день рождения ещё не наступил', () => {
    expect(computeAge(person({ date: '1 DEC 1982' }, null), now)).toBe(43);
  });

  it('жив: день рождения уже прошёл', () => {
    expect(computeAge(person({ date: '1 MAY 1982' }, null), now)).toBe(44);
  });

  it('жив: день рождения сегодня', () => {
    expect(computeAge(person({ date: '13 JUL 1982' }, null), now)).toBe(44);
  });

  it('жив: только год рождения — считает по годам', () => {
    expect(computeAge(person({ date: '1954' }, null), now)).toBe(72);
  });

  it('умер: возраст на дату смерти', () => {
    expect(computeAge(person({ date: '10 MAY 1888' }, { date: '5 MAY 1950' }), now)).toBe(61);
  });

  it('умер: только годы — разница лет', () => {
    expect(computeAge(person({ date: '1888' }, { date: '1950' }), now)).toBe(62);
  });

  it('умер, дата смерти неизвестна — null', () => {
    expect(computeAge(person({ date: '1888' }, { date: null }), now)).toBeNull();
  });

  it('нет даты рождения — null', () => {
    expect(computeAge(person(null, { date: '1950' }), now)).toBeNull();
  });

  it('жив, но родился слишком давно (нет записи о смерти) — null', () => {
    expect(computeAge(person({ date: '1888' }, null), now)).toBeNull();
  });

  it('смерть раньше рождения (кривые данные) — null', () => {
    expect(computeAge(person({ date: '1950' }, { date: '1888' }), now)).toBeNull();
  });
});

describe('formatYearsWithAge', () => {
  const now = new Date(2026, 6, 13);
  const person = (birth, death) => ({ birth, death });

  it('живой: год и текущий возраст', () => {
    expect(formatYearsWithAge(person({ date: '1 MAY 1982' }, null), now)).toBe('1982 (44)');
  });

  it('умерший: годы жизни и возраст на дату смерти', () => {
    expect(formatYearsWithAge(person({ date: '1888' }, { date: '1950' }), now)).toBe(
      '1888 – 1950 (62)',
    );
  });

  it('возраст не посчитать — просто годы', () => {
    expect(formatYearsWithAge(person({ date: '1888' }, { date: null }), now)).toBe('1888 – …');
  });

  it('дат нет — пустая строка', () => {
    expect(formatYearsWithAge(person(null, null), now)).toBe('');
  });
});

describe('shortName', () => {
  it('убирает отчество: первое слово имени + фамилия', () => {
    expect(shortName({ givenName: 'Тимофей Федорович', surname: 'Сопов' })).toBe('Тимофей Сопов');
  });

  it('имя из одного слова остаётся как есть', () => {
    expect(shortName({ givenName: 'Татьяна', surname: 'Сопова (Кисилёва)' })).toBe(
      'Татьяна Сопова (Кисилёва)',
    );
  });

  it('без фамилии — только имя', () => {
    expect(shortName({ givenName: 'Иван Петрович', surname: '' })).toBe('Иван');
  });

  it('без имени — только фамилия', () => {
    expect(shortName({ givenName: '', surname: 'Сопов' })).toBe('Сопов');
  });
});
