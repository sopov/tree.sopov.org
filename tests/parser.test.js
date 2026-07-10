import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../src/gedcom/parser.js';

const SAMPLE = [
  '0 HEAD',
  '1 SOUR ALTREE',
  '1 GEDC',
  '2 VERS 5.5',
  '0 @I1@ INDI',
  '1 NAME Тимофей Федорович /Сопов/',
  '1 SEX M',
  '1 BIRT',
  '2 DATE 1888',
  '2 PLAC Ивановка',
  '1 DEAT',
  '1 FAMC @F1@',
  '1 FAMS @F2@',
  '0 @I2@ INDI',
  '1 NAME Татьяна  /Сопова (Кисилёва)/',
  '1 SEX F',
  '1 FAMS @F2@',
  '1 NOTE из трёх деревень - пото',
  '2 CONC м образовался Белогорск',
  '2 CONT вторая строка',
  '0 @I3@ INDI',
  '1 NAME Иван /Сопов/',
  '1 SEX M',
  '1 FAMC @F2@',
  '0 @F2@ FAM',
  '1 HUSB @I1@',
  '1 WIFE @I2@',
  '1 CHIL @I3@',
  '0 TRLR',
].join('\r\n');

describe('parseGedcom', () => {
  it('извлекает персон с id, полом и разобранным именем', () => {
    const { individuals } = parseGedcom(SAMPLE);
    expect(individuals.size).toBe(3);
    const i1 = individuals.get('@I1@');
    expect(i1.sex).toBe('M');
    expect(i1.givenName).toBe('Тимофей Федорович');
    expect(i1.surname).toBe('Сопов');
    expect(i1.name).toBe('Тимофей Федорович Сопов');
  });

  it('терпит лишние пробелы в имени', () => {
    const { individuals } = parseGedcom(SAMPLE);
    const i2 = individuals.get('@I2@');
    expect(i2.givenName).toBe('Татьяна');
    expect(i2.surname).toBe('Сопова (Кисилёва)');
  });

  it('извлекает дату и место рождения, факт смерти без деталей', () => {
    const { individuals } = parseGedcom(SAMPLE);
    const i1 = individuals.get('@I1@');
    expect(i1.birth).toEqual({ date: '1888', place: 'Ивановка' });
    expect(i1.death).toEqual({ date: null, place: null });
    expect(individuals.get('@I3@').death).toBeNull();
  });

  it('склеивает NOTE через CONC (без перевода строки) и CONT (с переводом)', () => {
    const { individuals } = parseGedcom(SAMPLE);
    expect(individuals.get('@I2@').notes).toEqual([
      'из трёх деревень - потом образовался Белогорск\nвторая строка',
    ]);
  });

  it('связывает семьи: HUSB/WIFE/CHIL и обратные ссылки FAMC/FAMS', () => {
    const { individuals, families } = parseGedcom(SAMPLE);
    const f2 = families.get('@F2@');
    expect(f2.husband).toBe('@I1@');
    expect(f2.wife).toBe('@I2@');
    expect(f2.children).toEqual(['@I3@']);
    expect(individuals.get('@I1@').fams).toEqual(['@F2@']);
    expect(individuals.get('@I1@').famc).toEqual(['@F1@']);
    expect(individuals.get('@I3@').famc).toEqual(['@F2@']);
  });

  it('игнорирует HEAD и TRLR', () => {
    const { individuals, families } = parseGedcom(SAMPLE);
    expect(individuals.has('@HEAD@')).toBe(false);
    expect(families.size).toBe(1);
  });

  it('работает с LF без CR', () => {
    const { individuals } = parseGedcom(SAMPLE.replaceAll('\r\n', '\n'));
    expect(individuals.size).toBe(3);
  });

  it('_MARNM (MyHeritage): фамилия в браке + девичья в скобках', () => {
    const { individuals } = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME Наталия Васильевна /Зайцева/',
        '2 GIVN Наталия Васильевна',
        '2 SURN Зайцева',
        '2 _MARNM Сопова',
      ].join('\n'),
    );
    const p = individuals.get('@I1@');
    expect(p.surname).toBe('Сопова (Зайцева)');
    expect(p.name).toBe('Наталия Васильевна Сопова (Зайцева)');
  });

  it('_MARNM, совпадающий с фамилией, не дублируется', () => {
    const { individuals } = parseGedcom(
      ['0 @I1@ INDI', '1 NAME Мария /Шван/', '2 _MARNM Шван'].join('\n'),
    );
    expect(individuals.get('@I1@').name).toBe('Мария Шван');
  });
});
