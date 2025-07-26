// bot/searchHandler.js
const { findMaterials } = require('../services/db');

module.exports = async function handleSearch(context, searchQuery) {
  if (!searchQuery) return false;

  const query = searchQuery.toLowerCase();

  const results = await findMaterials(query);

  if (!results.length) {
    await context.sendActivity('❌ Нічого не знайдено. Спробуйте іншу фразу.');
    return true;
  }

  const chunks = [...Array(Math.ceil(results.length / 5))].map((_, i) =>
    results.slice(i * 5, (i + 1) * 5)
  );

  for (const chunk of chunks) {
    const lines = chunk.map(mat => {
      const original = mat.originalTitle || 'Без назви';
      const ukr = mat.ukrTitle || '';
      const author = mat.author || 'Без автора';
      const id = mat.id || '';
      return `📘 ${original} ${ukr ? `(${ukr})` : ''} — ${author}\n[Детальніше](https://t.me/genealogy_ukr_bot?start=details_${id})`;
    });

    await context.sendActivity({
      text: lines.join('\n\n'),
      markdown: true
    });
  }

  return true;
};