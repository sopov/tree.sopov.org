// Построение иерархий от выбранной персоны.
// visited защищает от циклов в битых данных.
// У потомков заполняются spouses, а каждый ребёнок помечен viaSpouse —
// индексом супруга, от брака с которым он родился (null, если супруг
// в файле не записан). У предков супруг — это второй родитель,
// он и так есть в дереве.

import { getParents } from '../gedcom/relations.js';

export function buildAncestorTree(data, rootId) {
  const visited = new Set();

  function build(person) {
    visited.add(person.id);
    const children = getParents(data, person.id)
      .filter((p) => !visited.has(p.id))
      .map(build);
    return { person, spouses: [], children };
  }

  const root = data.individuals.get(rootId);
  if (!root) return null;
  const tree = build(root);
  // Корень делит позицию с корнем дерева потомков, у которого супруги сдвигают
  // карточку персоны влево от центра узла. Без тех же супругов здесь линия
  // от родителей пришла бы в центр группы — в карточку супруга.
  tree.spouses = spousesOf(data, root);
  return tree;
}

function spousesOf(data, person) {
  const spouses = [];
  for (const famId of person.fams) {
    const fam = data.families.get(famId);
    if (!fam) continue;
    const spouseId = fam.husband === person.id ? fam.wife : fam.husband;
    const spouse = spouseId ? data.individuals.get(spouseId) : null;
    if (spouse) spouses.push(spouse);
  }
  return spouses;
}

export function buildDescendantTree(data, rootId) {
  const visited = new Set();

  function build(person) {
    visited.add(person.id);
    const spouses = [];
    const children = [];
    for (const famId of person.fams) {
      const fam = data.families.get(famId);
      if (!fam) continue;
      const spouseId = fam.husband === person.id ? fam.wife : fam.husband;
      const spouse = spouseId ? data.individuals.get(spouseId) : null;
      const viaSpouse = spouse ? spouses.push(spouse) - 1 : null;
      for (const childId of fam.children) {
        const child = data.individuals.get(childId);
        if (!child || visited.has(child.id)) continue;
        children.push({ ...build(child), viaSpouse });
      }
    }
    return { person, spouses, children };
  }

  const root = data.individuals.get(rootId);
  return root ? build(root) : null;
}
