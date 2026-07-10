// Парсер GEDCOM 5.5: текст → { individuals: Map, families: Map }.
// Строка формата: LEVEL [@XREF@] TAG [VALUE]

const LINE_RE = /^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?: (.*))?$/;

export function parseGedcom(text) {
  const records = buildRecords(text);
  const individuals = new Map();
  const families = new Map();
  for (const rec of records) {
    if (rec.tag === 'INDI') individuals.set(rec.xref, extractIndividual(rec));
    if (rec.tag === 'FAM') families.set(rec.xref, extractFamily(rec));
  }
  return { individuals, families };
}

function buildRecords(text) {
  const records = [];
  const stack = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;
    const m = line.match(LINE_RE);
    if (!m) continue;
    const [, levelStr, xref, tag, value = ''] = m;
    const level = Number(levelStr);

    if (tag === 'CONC' || tag === 'CONT') {
      const target = stack[level - 1];
      if (target) target.value += (tag === 'CONT' ? '\n' : '') + value;
      continue;
    }

    const node = { tag, xref: xref ?? null, value, children: [] };
    if (level === 0) {
      records.push(node);
    } else {
      stack[level - 1]?.children.push(node);
    }
    stack[level] = node;
    stack.length = level + 1;
  }
  return records;
}

function extractIndividual(rec) {
  const ind = {
    id: rec.xref,
    name: '',
    givenName: '',
    surname: '',
    sex: null,
    birth: null,
    death: null,
    famc: [],
    fams: [],
    notes: [],
  };
  for (const c of rec.children) {
    switch (c.tag) {
      case 'NAME': {
        const marriedName = c.children.find((n) => n.tag === '_MARNM')?.value ?? null;
        Object.assign(ind, parseName(c.value, marriedName));
        break;
      }
      case 'SEX':
        ind.sex = c.value || null;
        break;
      case 'BIRT':
        ind.birth = extractEvent(c);
        break;
      case 'DEAT':
        ind.death = extractEvent(c);
        break;
      case 'FAMC':
        ind.famc.push(c.value);
        break;
      case 'FAMS':
        ind.fams.push(c.value);
        break;
      case 'NOTE':
        ind.notes.push(c.value);
        break;
    }
  }
  return ind;
}

// GEDCOM-имя: «Имя Отчество /Фамилия/».
// Если есть фамилия в браке (_MARNM у MyHeritage), показываем её первой,
// а девичью — в скобках, как в записях Agelong: «Сопова (Зайцева)».
function parseName(value, marriedName = null) {
  const m = value.match(/^([^/]*)(?:\/([^/]*)\/)?(.*)$/);
  const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
  const givenName = clean(m[1]);
  const maiden = clean(m[2]);
  const married = clean(marriedName);
  const surname =
    married && maiden && married !== maiden ? `${married} (${maiden})` : maiden || married;
  return {
    givenName,
    surname,
    name: [givenName, surname].filter(Boolean).join(' '),
  };
}

function extractEvent(node) {
  const find = (tag) => node.children.find((c) => c.tag === tag)?.value ?? null;
  return { date: find('DATE'), place: find('PLAC') };
}

function extractFamily(rec) {
  const fam = { id: rec.xref, husband: null, wife: null, children: [] };
  for (const c of rec.children) {
    if (c.tag === 'HUSB') fam.husband = c.value;
    if (c.tag === 'WIFE') fam.wife = c.value;
    if (c.tag === 'CHIL') fam.children.push(c.value);
  }
  return fam;
}
