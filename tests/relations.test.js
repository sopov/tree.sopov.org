import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../src/gedcom/parser.js';
import {
  getParents,
  getSpouses,
  getChildren,
  getSiblings,
  findPerson,
} from '../src/gedcom/relations.js';

const SAMPLE = [
  '0 @I1@ INDI',
  '1 NAME Отец //',
  '1 SEX M',
  '1 FAMS @F1@',
  '0 @I2@ INDI',
  '1 NAME Мать //',
  '1 SEX F',
  '1 FAMS @F1@',
  '0 @I3@ INDI',
  '1 NAME Сын //',
  '1 SEX M',
  '1 FAMC @F1@',
  '1 FAMS @F2@',
  '0 @I4@ INDI',
  '1 NAME Жена сына //',
  '1 SEX F',
  '1 FAMS @F2@',
  '0 @I5@ INDI',
  '1 NAME Внучка //',
  '1 SEX F',
  '1 FAMC @F2@',
  '0 @F1@ FAM',
  '1 HUSB @I1@',
  '1 WIFE @I2@',
  '1 CHIL @I3@',
  '0 @F2@ FAM',
  '1 HUSB @I3@',
  '1 WIFE @I4@',
  '1 CHIL @I5@',
].join('\n');

const data = parseGedcom(SAMPLE);

describe('relations', () => {
  it('getParents возвращает отца и мать', () => {
    expect(getParents(data, '@I3@').map((p) => p.id)).toEqual(['@I1@', '@I2@']);
  });

  it('getParents для корня — пустой список', () => {
    expect(getParents(data, '@I1@')).toEqual([]);
  });

  it('getSpouses возвращает супругу', () => {
    expect(getSpouses(data, '@I3@').map((p) => p.id)).toEqual(['@I4@']);
  });

  it('getChildren возвращает детей из всех семей', () => {
    expect(getChildren(data, '@I3@').map((p) => p.id)).toEqual(['@I5@']);
    expect(getChildren(data, '@I1@').map((p) => p.id)).toEqual(['@I3@']);
  });

  it('битые ссылки не роняют, а пропускаются', () => {
    const broken = parseGedcom(['0 @I9@ INDI', '1 NAME X //', '1 FAMC @F9@'].join('\n'));
    expect(getParents(broken, '@I9@')).toEqual([]);
    expect(getChildren(broken, '@I9@')).toEqual([]);
    expect(getSpouses(broken, '@I9@')).toEqual([]);
    expect(getSiblings(broken, '@I9@')).toEqual([]);
  });

  it('getSiblings возвращает других детей родителей, без самого человека', () => {
    const withSibling = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME Отец //',
        '1 FAMS @F1@',
        '0 @I2@ INDI',
        '1 NAME Сын //',
        '1 FAMC @F1@',
        '0 @I3@ INDI',
        '1 NAME Дочь //',
        '1 FAMC @F1@',
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 CHIL @I2@',
        '1 CHIL @I3@',
      ].join('\n'),
    );
    expect(getSiblings(withSibling, '@I2@').map((p) => p.id)).toEqual(['@I3@']);
    expect(getSiblings(withSibling, '@I3@').map((p) => p.id)).toEqual(['@I2@']);
  });

  it('getSiblings у единственного ребёнка — пусто', () => {
    expect(getSiblings(data, '@I5@')).toEqual([]);
  });
});

describe('findPerson', () => {
  const people = parseGedcom(
    [
      '0 @I1@ INDI',
      '1 NAME Леонид Валентинович /Сопов/',
      '0 @I2@ INDI',
      '1 NAME Леонид Юрьевич /Сопов/',
      '1 BIRT',
      '2 DATE 9 FEB 1982',
    ].join('\n'),
  );

  it('находит по словам имени в любом порядке и году рождения', () => {
    expect(findPerson(people, { name: 'Сопов Леонид Юрьевич', birthYear: '1982' }).id).toBe('@I2@');
  });

  it('год рождения отсекает тёзку без даты', () => {
    expect(findPerson(people, { name: 'Сопов Леонид', birthYear: '1982' }).id).toBe('@I2@');
  });

  it('без года берёт первое совпадение по имени', () => {
    expect(findPerson(people, { name: 'Леонид Валентинович Сопов' }).id).toBe('@I1@');
  });

  it('null, если никто не подошёл', () => {
    expect(findPerson(people, { name: 'Пётр Иванов', birthYear: '1982' })).toBeNull();
  });
});
