import { describe, it, expect } from 'vitest';
import {
  CARD_H,
  CARD_W,
  SPOUSE_GAP,
  childPath,
  marriageDotX,
  nodeWidth,
  personX,
} from '../src/tree/geometry.js';

// Узел d3-иерархии: пара/группа центрирована на x, карточки высотой CARD_H вокруг y.
const node = (x, y, spouses = [], viaSpouse = null) => ({
  x,
  y,
  data: { person: {}, spouses, viaSpouse },
});

const spouse = {};

describe('nodeWidth / personX', () => {
  it('без супругов узел шириной в одну карточку, персона в центре', () => {
    expect(nodeWidth(node(0, 0))).toBe(CARD_W);
    expect(personX(node(100, 0))).toBe(100);
  });

  it('с супругом персона сдвинута влево от центра узла', () => {
    const n = node(0, 0, [spouse]);
    expect(nodeWidth(n)).toBe(2 * CARD_W + SPOUSE_GAP);
    expect(personX(n)).toBe(-(CARD_W + SPOUSE_GAP) / 2);
  });
});

describe('marriageDotX', () => {
  it('точка первого брака — в зазоре между персоной и первым супругом', () => {
    const n = node(0, 0, [spouse]);
    expect(marriageDotX(n, 0)).toBe(personX(n) + CARD_W / 2 + SPOUSE_GAP / 2);
  });

  it('точка второго брака — в зазоре слева от второго супруга', () => {
    const n = node(0, 0, [spouse, spouse]);
    expect(marriageDotX(n, 1)).toBe(
      personX(n) + (CARD_W + SPOUSE_GAP) + CARD_W / 2 + SPOUSE_GAP / 2,
    );
  });
});

describe('childPath', () => {
  const LEVEL = 110;

  it('ребёнок без записанного второго родителя: линия от низа карточки персоны', () => {
    const link = { source: node(0, 0), target: node(0, LEVEL) };
    expect(childPath(link)).toBe(`M0,${CARD_H / 2} V44 H0 V${LEVEL - CARD_H / 2}`);
  });

  it('ребёнок от брака: линия стартует из точки брака на высоте центра карточек', () => {
    const source = node(0, 0, [spouse]);
    const link = { source, target: node(200, LEVEL, [], 0) };
    expect(childPath(link)).toBe(`M${marriageDotX(source, 0)},0 V44 H200 V${LEVEL - CARD_H / 2}`);
  });

  it('полка второго брака ниже полки первого', () => {
    const source = node(0, 0, [spouse, spouse]);
    const first = childPath({ source, target: node(-100, LEVEL, [], 0) });
    const second = childPath({ source, target: node(300, LEVEL, [], 1) });
    const shelfOf = (path) => Number(path.match(/V(-?\d+(?:\.\d+)?)/)[1]);
    expect(shelfOf(second)).toBeGreaterThan(shelfOf(first));
  });

  it('полка ребёнка от незаписанного партнёра ниже полок всех известных браков', () => {
    const source = node(0, 0, [spouse]);
    const married = childPath({ source, target: node(-100, LEVEL, [], 0) });
    const unknown = childPath({ source, target: node(300, LEVEL, [], null) });
    const shelfOf = (path) => Number(path.match(/V(-?\d+(?:\.\d+)?)/)[1]);
    expect(shelfOf(unknown)).toBeGreaterThan(shelfOf(married));
  });

  it('полка не опускается ниже верха карточки ребёнка даже при многих браках', () => {
    const spouses = [spouse, spouse, spouse, spouse, spouse];
    const source = node(0, 0, spouses, null);
    const path = childPath({ source, target: node(0, LEVEL, [], 4) });
    const shelf = Number(path.match(/V(-?\d+(?:\.\d+)?)/)[1]);
    expect(shelf).toBeLessThan(LEVEL - CARD_H / 2);
  });

  it('линия вверх (к предкам): от верха карточки, полка над карточкой источника', () => {
    const link = { source: node(0, 0), target: node(150, -LEVEL) };
    expect(childPath(link)).toBe(`M0,${-CARD_H / 2} V-44 H150 V${-(LEVEL - CARD_H / 2)}`);
  });
});
