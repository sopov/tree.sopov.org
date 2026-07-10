// Отрисовка дерева: предки вверх, потомки вниз от корневой персоны.
// Супруги потомков рисуются карточкой справа, пара центрируется на узле.

import { hierarchy, tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { buildAncestorTree, buildDescendantTree } from './layout.js';
import { formatYearsWithAge, shortName } from './format.js';
import {
  CARD_H,
  CARD_W,
  LEVEL_H,
  SPOUSE_GAP,
  UNIT,
  cardsOfNode,
  childPath,
  marriageDotX,
  nodeWidth,
} from './geometry.js';

const NAME_MAX = 24;
const DOT_R = 3.5;
// Диагональная лента через нижний правый угол: внешний и внутренний срезы.
const RIBBON_OUT = 24;
const RIBBON_IN = 13;

export function renderTree(svgEl, data, rootId, onSelect) {
  const svg = select(svgEl);
  svg.selectAll('*').remove();

  // Клип по форме карточки, чтобы траурный уголок не вылезал за скруглённый угол.
  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'card-clip')
    .append('rect')
    .attr('width', CARD_W)
    .attr('height', CARD_H)
    .attr('rx', 6);

  const viewport = svg.append('g');

  const layout = tree()
    .nodeSize([UNIT, LEVEL_H])
    .separation(
      (a, b) => (nodeWidth(a) + nodeWidth(b)) / 2 / UNIT + (a.parent === b.parent ? 0.12 : 0.35),
    );

  const desc = hierarchy(buildDescendantTree(data, rootId), (d) => d.children);
  const anc = hierarchy(buildAncestorTree(data, rootId), (d) => d.children);
  layout(desc);
  layout(anc);
  anc.each((d) => {
    d.y = -d.y;
  });

  const links = [...desc.links(), ...anc.links()];
  const nodes = [...desc.descendants(), ...anc.descendants().filter((d) => d.depth > 0)];
  const cards = nodes.flatMap(cardsOfNode);

  viewport
    .selectAll('path.link')
    .data(links)
    .join('path')
    .attr('class', 'link')
    .attr('d', childPath);

  viewport
    .selectAll('line.link--spouse')
    .data(cards.filter((c) => c.spouseIndex > 0))
    .join('line')
    .attr('class', 'link link--spouse')
    .attr('x1', (c) => c.x - SPOUSE_GAP)
    .attr('x2', (c) => c.x)
    .attr('y1', (c) => c.y + CARD_H / 2)
    .attr('y2', (c) => c.y + CARD_H / 2);

  // Точки браков: узелок в зазоре перед карточкой каждого супруга.
  viewport
    .selectAll('circle.marriage-dot')
    .data(
      nodes.flatMap((d) => d.data.spouses.map((_, via) => ({ x: marriageDotX(d, via), y: d.y }))),
    )
    .join('circle')
    .attr('class', 'marriage-dot')
    .attr('r', DOT_R)
    .attr('cx', (m) => m.x)
    .attr('cy', (m) => m.y);

  const card = viewport
    .selectAll('g.card')
    .data(cards)
    .join('g')
    .attr('class', (c) => cardClass(c.person, rootId))
    .attr('transform', (c) => `translate(${c.x},${c.y})`)
    .on('click', (event, c) => onSelect(c.person.id));

  card.append('rect').attr('width', CARD_W).attr('height', CARD_H).attr('rx', 6);

  // Траурная лента у умерших (есть запись DEAT, даже без даты).
  card
    .filter((c) => Boolean(c.person.death))
    .append('path')
    .attr('class', 'card-ribbon')
    .attr(
      'd',
      `M${CARD_W - RIBBON_OUT} ${CARD_H} L${CARD_W} ${CARD_H - RIBBON_OUT}` +
        ` V${CARD_H - RIBBON_IN} L${CARD_W - RIBBON_IN} ${CARD_H} Z`,
    )
    .attr('clip-path', 'url(#card-clip)');

  card
    .append('text')
    .attr('class', 'card-name')
    .attr('x', CARD_W / 2)
    .attr('y', 19)
    .text((c) => truncate(shortName(c.person)));

  card
    .append('text')
    .attr('class', 'card-years')
    .attr('x', CARD_W / 2)
    .attr('y', 37)
    .text((c) => formatYearsWithAge(c.person));

  card.append('title').text((c) => `${c.person.name} ${formatYearsWithAge(c.person)}`.trim());

  const { width, height } = svgEl.getBoundingClientRect();
  const zoomBehavior = zoom()
    .scaleExtent([0.15, 3])
    .on('zoom', (event) => viewport.attr('transform', event.transform));
  svg.call(zoomBehavior);
  svg.call(zoomBehavior.transform, zoomIdentity.translate(width / 2, height / 2));
}

function cardClass(person, rootId) {
  const sex = person.sex === 'M' ? 'card--m' : person.sex === 'F' ? 'card--f' : 'card--u';
  return `card ${sex}${person.id === rootId ? ' card--root' : ''}`;
}

function truncate(name) {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name;
}
