// bot/dialogManager.js
const { CardFactory } = require('botbuilder');

module.exports = async function handleMenu(context) {
  //console.log('➡️ handleMenu викликано для каналу:', context.activity.channelId);

  const card = CardFactory.heroCard(
    '📚 Генеалогічна бібліотека',
    'Оберіть дію або введіть команду вручну:',
    null,
    [
      { type: 'imBack', title: '🔎 Пошук', value: 'Пошук' },
      { type: 'imBack', title: '➕ Додати книгу', value: 'Додати книгу' },
      { type: 'imBack', title: 'ℹ️ Допомога', value: 'Допомога' },
      { type: 'imBack', title: '📎 Інше', value: 'Інше' }
    ]
  );


  await context.sendActivity({ attachments: [card] });
};
