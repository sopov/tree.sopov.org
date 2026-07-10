// Чистая геометрия дерева: размеры карточек, позиции пары, точки браков
// и пути связей родитель–ребёнок. Никакого DOM — всё тестируется напрямую.

export const CARD_W = 170;
export const CARD_H = 48;
export const H_GAP = 20;
export const SPOUSE_GAP = 12;
export const LEVEL_H = 110;
export const UNIT = CARD_W + H_GAP;

// Полки (горизонтальные участки) линий к детям: первый брак выше, каждый
// следующий на SHELF_STEP ниже, чтобы линии разных браков не сливались.
const SHELF_BASE = 20;
const SHELF_STEP = 13;
const SHELF_CHILD_MARGIN = 6;

export function nodeWidth(d) {
  return CARD_W + d.data.spouses.length * (SPOUSE_GAP + CARD_W);
}

// Центр карточки самой персоны (пара центрирована на d.x, персона — слева).
export function personX(d) {
  return d.x - nodeWidth(d) / 2 + CARD_W / 2;
}

// Точка брака via (0-based): узелок на линии супругов, в зазоре слева
// от карточки супруга этого брака.
export function marriageDotX(d, via) {
  return personX(d) + via * (CARD_W + SPOUSE_GAP) + CARD_W / 2 + SPOUSE_GAP / 2;
}

// Карточки узла: сама персона и её супруги справа; пара центрирована на d.x.
export function cardsOfNode(d) {
  const left = d.x - nodeWidth(d) / 2;
  const top = d.y - CARD_H / 2;
  return [d.data.person, ...d.data.spouses].map((person, i) => ({
    person,
    spouseIndex: i,
    x: left + i * (CARD_W + SPOUSE_GAP),
    y: top,
  }));
}

// Путь родитель → ребёнок. Если брак известен (viaSpouse), линия стартует
// из точки брака на высоте центра карточек; иначе — от кромки карточки персоны,
// а полка идёт на ступень ниже полок всех известных браков, чтобы не сливаться
// с ними. Полка своего брака — на своей высоте, но не ниже верха карточки ребёнка.
export function childPath(link) {
  const via = link.target.data.viaSpouse;
  const down = link.target.y > link.source.y;
  const dir = down ? 1 : -1;
  const x0 = via == null ? personX(link.source) : marriageDotX(link.source, via);
  const x1 = personX(link.target);
  const y0 = link.source.y + (via == null ? (CARD_H / 2) * dir : 0);
  const y1 = link.target.y - (CARD_H / 2) * dir;
  const edge = link.source.y + (CARD_H / 2) * dir;
  const shelfMax = y1 - SHELF_CHILD_MARGIN * dir;
  const shelfIndex = via ?? link.source.data.spouses.length;
  const shelf = edge + (SHELF_BASE + shelfIndex * SHELF_STEP) * dir;
  const shelfY = down ? Math.min(shelf, shelfMax) : Math.max(shelf, shelfMax);
  return `M${x0},${y0} V${shelfY} H${x1} V${y1}`;
}
