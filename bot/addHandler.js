// bot/addHandler.js
const container = require('../services/db');

module.exports = async function handleAdd(context) {
    const text = context.activity.text;
    const parts = text.split('|');

    if (parts.length === 6) {
        const [_, title, author, year, category, region] = parts;
        const newItem = {
            id: `${Date.now()}`,
            title: title.trim(),
            author: author.trim(),
            year: parseInt(year.trim()),
            category: category.trim(),
            region: region.trim(),
            added_by: context.activity.from.id,
            timestamp: new Date().toISOString(),
        };

        try {
            await container.items.create(newItem);
            await context.sendActivity(`✅ Запис **"${newItem.title}"** додано успішно!`);
        } catch (err) {
            console.error('❌ DB error:', err);
            await context.sendActivity('🚫 Помилка при додаванні запису до бази.');
        }
    } else {
        await context.sendActivity(
            '❗ Невірний формат. Надішли повідомлення у форматі:\n\n' +
            '`add|назва|автор|рік|категорія|регіон`'
        );
    }
};