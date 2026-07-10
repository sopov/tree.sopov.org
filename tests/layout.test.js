import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../src/gedcom/parser.js';
import { buildAncestorTree, buildDescendantTree } from '../src/tree/layout.js';

const SAMPLE = [
  '0 @I1@ INDI',
  '1 NAME Дед //',
  '1 FAMS @F1@',
  '0 @I2@ INDI',
  '1 NAME Бабушка //',
  '1 FAMS @F1@',
  '0 @I3@ INDI',
  '1 NAME Отец //',
  '1 FAMC @F1@',
  '1 FAMS @F2@',
  '0 @I4@ INDI',
  '1 NAME Мать //',
  '1 FAMS @F2@',
  '0 @I5@ INDI',
  '1 NAME Дочь //',
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

describe('buildAncestorTree', () => {
  it('строит дерево предков: родители — потомки узла', () => {
    const tree = buildAncestorTree(data, '@I5@');
    expect(tree.person.id).toBe('@I5@');
    expect(tree.children.map((c) => c.person.id)).toEqual(['@I3@', '@I4@']);
    const father = tree.children[0];
    expect(father.children.map((c) => c.person.id)).toEqual(['@I1@', '@I2@']);
  });

  it('у корневого предка нет детей-узлов', () => {
    const tree = buildAncestorTree(data, '@I1@');
    expect(tree.children).toEqual([]);
  });

  it('корень несёт своих супругов — как в дереве потомков, иначе геометрия карточек не совпадёт', () => {
    const tree = buildAncestorTree(data, '@I3@');
    expect(tree.spouses.map((s) => s.id)).toEqual(['@I4@']);
  });

  it('у остальных предков супругов нет: второй родитель — отдельный узел', () => {
    const tree = buildAncestorTree(data, '@I5@');
    expect(tree.children.every((c) => c.spouses.length === 0)).toBe(true);
  });
});

describe('buildDescendantTree', () => {
  it('строит дерево потомков', () => {
    const tree = buildDescendantTree(data, '@I1@');
    expect(tree.person.id).toBe('@I1@');
    expect(tree.children.map((c) => c.person.id)).toEqual(['@I3@']);
    expect(tree.children[0].children.map((c) => c.person.id)).toEqual(['@I5@']);
  });

  it('добавляет супругов к каждому узлу потомков', () => {
    const tree = buildDescendantTree(data, '@I1@');
    expect(tree.spouses.map((s) => s.id)).toEqual(['@I2@']);
    expect(tree.children[0].spouses.map((s) => s.id)).toEqual(['@I4@']);
    expect(tree.children[0].children[0].spouses).toEqual([]);
  });

  it('помечает, от какого брака ребёнок (индекс супруга)', () => {
    const tree = buildDescendantTree(data, '@I1@');
    expect(tree.children[0].viaSpouse).toBe(0);
    expect(tree.children[0].children[0].viaSpouse).toBe(0);
  });

  it('дети из разных браков получают индексы своих супругов', () => {
    const twoWives = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME Муж //',
        '1 FAMS @F1@',
        '1 FAMS @F2@',
        '0 @I2@ INDI',
        '1 NAME Жена1 //',
        '1 FAMS @F1@',
        '0 @I3@ INDI',
        '1 NAME Жена2 //',
        '1 FAMS @F2@',
        '0 @I4@ INDI',
        '1 NAME РебёнокОт1 //',
        '1 FAMC @F1@',
        '0 @I5@ INDI',
        '1 NAME РебёнокОт2 //',
        '1 FAMC @F2@',
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '1 CHIL @I4@',
        '0 @F2@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I3@',
        '1 CHIL @I5@',
      ].join('\n'),
    );
    const tree = buildDescendantTree(twoWives, '@I1@');
    expect(tree.spouses.map((s) => s.id)).toEqual(['@I2@', '@I3@']);
    const byId = Object.fromEntries(tree.children.map((c) => [c.person.id, c.viaSpouse]));
    expect(byId['@I4@']).toBe(0);
    expect(byId['@I5@']).toBe(1);
  });

  it('ребёнок из семьи без записанного супруга получает viaSpouse = null', () => {
    const single = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME Мать //',
        '1 FAMS @F1@',
        '0 @I2@ INDI',
        '1 NAME Ребёнок //',
        '1 FAMC @F1@',
        '0 @F1@ FAM',
        '1 WIFE @I1@',
        '1 CHIL @I2@',
      ].join('\n'),
    );
    const tree = buildDescendantTree(single, '@I1@');
    expect(tree.spouses).toEqual([]);
    expect(tree.children[0].viaSpouse).toBeNull();
  });

  it('не зацикливается на битых данных (человек — предок самого себя)', () => {
    const cyclic = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME X //',
        '1 FAMC @F1@',
        '1 FAMS @F1@',
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 CHIL @I1@',
      ].join('\n'),
    );
    const desc = buildDescendantTree(cyclic, '@I1@');
    expect(desc.children).toEqual([]);
    const anc = buildAncestorTree(cyclic, '@I1@');
    expect(anc.children).toEqual([]);
  });
});
