// Навигация по распарсенным данным: родители, супруги, дети.
// Битые ссылки (нет семьи или персоны) молча пропускаются.

export function getParents(data, personId) {
  const person = data.individuals.get(personId);
  if (!person) return [];
  const parents = [];
  for (const famId of person.famc) {
    const fam = data.families.get(famId);
    if (!fam) continue;
    for (const pid of [fam.husband, fam.wife]) {
      const p = pid && data.individuals.get(pid);
      if (p) parents.push(p);
    }
  }
  return parents;
}

export function getSpouses(data, personId) {
  const person = data.individuals.get(personId);
  if (!person) return [];
  const spouses = [];
  for (const famId of person.fams) {
    const fam = data.families.get(famId);
    if (!fam) continue;
    for (const pid of [fam.husband, fam.wife]) {
      if (!pid || pid === personId) continue;
      const p = data.individuals.get(pid);
      if (p) spouses.push(p);
    }
  }
  return spouses;
}

// Поиск персоны по словам имени (в любом порядке) и, опционально, году рождения.
// Нужен, чтобы задавать людей в конфиге независимо от @Ixx@-идентификаторов,
// которые могут меняться при пересоздании GEDCOM.
export function findPerson(data, { name, birthYear }) {
  const wanted = name.toLowerCase().split(/\s+/).filter(Boolean);
  for (const person of data.individuals.values()) {
    const tokens = new Set(person.name.toLowerCase().split(/\s+/));
    if (!wanted.every((w) => tokens.has(w))) continue;
    if (birthYear && !(person.birth?.date ?? '').includes(birthYear)) continue;
    return person;
  }
  return null;
}

export function getSiblings(data, personId) {
  const seen = new Set([personId]);
  const siblings = [];
  for (const parent of getParents(data, personId)) {
    for (const child of getChildren(data, parent.id)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      siblings.push(child);
    }
  }
  return siblings;
}

export function getChildren(data, personId) {
  const person = data.individuals.get(personId);
  if (!person) return [];
  const children = [];
  for (const famId of person.fams) {
    const fam = data.families.get(famId);
    if (!fam) continue;
    for (const cid of fam.children) {
      const c = data.individuals.get(cid);
      if (c) children.push(c);
    }
  }
  return children;
}
