// bot/dialogManager.js
const { CardFactory } = require('botbuilder');

module.exports = async function handleMenu(context) {
    console.log('➡️ handleMenu тестово працює');
    await context.sendActivity('👋 Привіт! Це тестове повідомлення без кнопок.');
  };

/* module.exports = async function handleMenu(context, text) {
  console.log('➡️ handleMenu викликано для каналу:', context.activity.channelId);
  if (context.activity.channelId === 'telegram') {
    console.log('📤 Надсилаємо меню...');
    await context.sendActivity({
      text: 'Оберіть дію:',
      channelData: {
        method: 'sendMessage',
        reply_markup: {
          keyboard: [
            ['🔍 Пошук книг', '➕ Додати книгу'],
            ['ℹ️ Допомога', '📎 Інше']
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    });
  } else {
    const card = CardFactory.heroCard(
      '📚 Генеалогічна бібліотека',
      'Оберіть дію:',
      null,
      [
        { type: 'imBack', title: '🔍 Пошук книг', value: 'Пошук книг' },
        { type: 'imBack', title: '➕ Додати книгу', value: 'Додати книгу' },
        { type: 'imBack', title: 'ℹ️ Допомога', value: 'Допомога' },
        { type: 'imBack', title: '📎 Інше', value: 'Інше' }
      ]
    );
    console.log('📤 Надсилаємо меню...');
    await context.sendActivity({ attachments: [card] });
  }
}; */