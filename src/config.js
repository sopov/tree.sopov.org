// Путь к GEDCOM-файлу: замените public/tree.ged, чтобы обновить данные.
export const GEDCOM_URL = `${import.meta.env.BASE_URL}tree.ged`;

// Персона, с которой открывается дерево (если в URL нет другой).
// Ищется по словам имени и году рождения, а не по @Ixx@ —
// идентификаторы могут меняться при пересоздании файла.
export const DEFAULT_PERSON = { name: 'Сопов Леонид Юрьевич', birthYear: '1982' };
