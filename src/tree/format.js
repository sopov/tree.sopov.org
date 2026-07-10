// Форматирование дат для подписей.

const MONTHS = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

// Живых старше этого возраста не показываем: скорее всего просто нет записи о смерти.
const LIVING_AGE_MAX = 110;

export function extractYear(dateValue) {
  const m = (dateValue ?? '').match(/\d{3,4}/g);
  return m ? m[m.length - 1] : null;
}

// GEDCOM-дата → { year, month, day } (month/day могут быть null).
// Понимает «12 MAY 1954», «MAY 1954», «1954», «ABT 1954».
export function parseGedcomDate(dateValue) {
  const year = extractYear(dateValue);
  if (!year) return null;
  const m = (dateValue ?? '').toUpperCase().match(/(?:(\d{1,2})\s+)?([A-Z]{3})\s+\d{3,4}/);
  return {
    year: Number(year),
    month: m ? (MONTHS[m[2]] ?? null) : null,
    day: m?.[1] ? Number(m[1]) : null,
  };
}

// Возраст: для живых — на сегодня, для умерших — на дату смерти.
// null, если дат не хватает, возраст отрицательный
// или живому вышло бы за LIVING_AGE_MAX (запись о смерти просто отсутствует).
export function computeAge(person, now = new Date()) {
  const birth = parseGedcomDate(person.birth?.date);
  if (!birth) return null;
  const end = person.death
    ? parseGedcomDate(person.death.date)
    : { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  if (!end) return null;
  const age = fullYears(birth, end);
  if (age < 0) return null;
  if (!person.death && age > LIVING_AGE_MAX) return null;
  return age;
}

// Годы жизни с возрастом в скобках: «1954 (72)» — живому сейчас, «1888 – 1950 (61)» — на дату смерти.
export function formatYearsWithAge(person, now = new Date()) {
  const years = formatYears(person);
  const age = computeAge(person, now);
  return age === null ? years : `${years} (${age})`;
}

// Полных лет между датами; без месяцев считает разницу годов (точность ±1).
function fullYears(from, to) {
  let years = to.year - from.year;
  if (from.month && to.month) {
    const beforeBirthday =
      to.month < from.month ||
      (to.month === from.month && from.day != null && to.day != null && to.day < from.day);
    if (beforeBirthday) years -= 1;
  }
  return years;
}

// Имя без отчества: первое слово имени + фамилия (для компактных карточек).
export function shortName(person) {
  const first = person.givenName.split(' ')[0];
  return [first, person.surname].filter(Boolean).join(' ');
}

// «1888 – 1950», «1888», «1888 – …» (умер, дата неизвестна), «… – 1950».
// Если ни одной даты нет — пустая строка.
export function formatYears(person) {
  const birth = extractYear(person.birth?.date);
  const death = person.death ? (extractYear(person.death.date) ?? '…') : null;
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return birth;
  if (death && death !== '…') return `… – ${death}`;
  return '';
}
