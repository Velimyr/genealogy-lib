// bot/searchHandler.js
const { findMaterials } = require('../services/db');

module.exports = async function handleSearch(context, searchQuery) {
  if (!searchQuery) return false;

  console.log('[handleSearch] Отримано пошуковий запит:', searchQuery);

  const query = searchQuery.toLowerCase();

  const results = await findMaterials(query);

  console.log('[handleSearch] Знайдено результатів:', results.length);

  if (!results.length) {
    await context.sendActivity({
      text: '❌ Нічого не знайдено. Спробуйте іншу фразу.',
      textFormat: 'plain'
    });
    return true;
  }

  const chunks = [...Array(Math.ceil(results.length / 5))].map((_, i) =>
    results.slice(i * 5, (i + 1) * 5)
  );

  for (const chunk of chunks) {
    const attachments = chunk.map(mat => {
      const original = mat.originalTitle || 'Без назви';
      const ukr = mat.ukrTitle || '';
      const author = mat.author || 'Без автора';
      const telegramChannelLink = mat.telegramChannelLink || null;

      const buttons = [];

      if (telegramChannelLink) {
        buttons.push({
          type: 'openUrl',
          title: 'Детальніше',
          value: telegramChannelLink,
        });
      }

      console.log('[handleSearch] Формується картка для:', original, ukr, author);

      return {
        contentType: 'application/vnd.microsoft.card.hero',
        content: {
          title: `${original} ${ukr ? `(${ukr})` : ''}`,
          subtitle: author,
          buttons: buttons
        }
      };
    });

    await context.sendActivity({
      attachments: attachments,
      attachmentLayout: 'carousel',
      textFormat: 'plain'
    });
  }

  console.log('[handleSearch] Завершено відправку результатів, додаємо кнопку "Головне меню"');

  await context.sendActivity({
    text: 'Натисніть кнопку нижче, щоб повернутися в головне меню.',
    textFormat: 'plain',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.hero',
        content: {
          buttons: [
            {
              type: 'imBack',
              title: 'Головне меню',
              value: 'меню'
            }
          ]
        }
      }
    ]
  });
  return true;
};