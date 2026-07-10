import './style.css';
import { GEDCOM_URL, DEFAULT_PERSON } from './config.js';
import { parseGedcom } from './gedcom/parser.js';
import {
  getParents,
  getSpouses,
  getChildren,
  getSiblings,
  findPerson,
} from './gedcom/relations.js';
import { renderTree } from './tree/render.js';
import { formatYears, formatYearsWithAge } from './tree/format.js';

const app = document.querySelector('#app');

async function init() {
  const res = await fetch(GEDCOM_URL);
  if (!res.ok) {
    app.innerHTML = `<p class="error">Не удалось загрузить данные (${res.status}).</p>`;
    return;
  }
  const data = parseGedcom(await res.text());
  if (data.individuals.size === 0) {
    app.innerHTML = '<p class="error">В файле не найдено ни одной персоны.</p>';
    return;
  }

  app.innerHTML = `
    <header>
      <h1>Семейное древо</h1>
      <input id="search" list="people" placeholder="Найти человека…" />
      <datalist id="people"></datalist>
      <div class="legend">
        <span class="legend--m">мужчины</span>
        <span class="legend--f">женщины</span>
      </div>
    </header>
    <main>
      <svg id="tree"></svg>
      <aside id="panel"></aside>
    </main>
  `;

  const svg = document.querySelector('#tree');
  const labelToId = fillSearch(data);
  let rootId = initialRoot(data);

  function setRoot(id) {
    rootId = id;
    // В URL идентификатор без обёртки из @: #I31 вместо #%40I31%40.
    location.hash = id.replaceAll('@', '');
    renderTree(svg, data, rootId, setRoot);
    fillPanel(data, rootId, setRoot);
  }

  document.querySelector('#search').addEventListener('change', (e) => {
    const id = labelToId.get(e.target.value);
    if (id) {
      setRoot(id);
      e.target.value = '';
    }
  });

  window.addEventListener('resize', () => renderTree(svg, data, rootId, setRoot));

  setRoot(rootId);
}

function initialRoot(data) {
  const raw = decodeURIComponent(location.hash.slice(1));
  for (const id of [`@${raw}@`, raw]) {
    if (data.individuals.has(id)) return id;
  }
  const defaultPerson = findPerson(data, DEFAULT_PERSON);
  if (defaultPerson) return defaultPerson.id;
  return data.individuals.keys().next().value;
}

function personLabel(person) {
  const years = formatYears(person);
  return years ? `${person.name} (${years})` : person.name;
}

function fillSearch(data) {
  const datalist = document.querySelector('#people');
  const labelToId = new Map();
  for (const person of data.individuals.values()) {
    const label = personLabel(person);
    labelToId.set(label, person.id);
    const option = document.createElement('option');
    option.value = label;
    datalist.append(option);
  }
  return labelToId;
}

function fillPanel(data, personId, onSelect) {
  const panel = document.querySelector('#panel');
  const person = data.individuals.get(personId);
  panel.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = person.name;
  panel.append(h2);

  addLine(panel, 'years', formatYearsWithAge(person));
  addLine(panel, 'place', person.birth?.place && `Род.: ${person.birth.place}`);
  addLine(panel, 'place', person.death?.place && `Ум.: ${person.death.place}`);
  for (const note of person.notes) addLine(panel, 'note', note);

  addRelatives(panel, 'Родители', getParents(data, personId), onSelect);
  addRelatives(panel, 'Братья и сёстры', getSiblings(data, personId), onSelect);
  addRelatives(panel, 'Супруги', getSpouses(data, personId), onSelect);
  addRelatives(panel, 'Дети', getChildren(data, personId), onSelect);
}

function addLine(panel, className, text) {
  if (!text) return;
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  panel.append(p);
}

function addRelatives(panel, title, relatives, onSelect) {
  if (relatives.length === 0) return;
  const h3 = document.createElement('h3');
  h3.textContent = title;
  panel.append(h3);
  for (const person of relatives) {
    const btn = document.createElement('button');
    btn.textContent = personLabel(person);
    btn.addEventListener('click', () => onSelect(person.id));
    panel.append(btn);
  }
}

init();
