const restify = require('restify');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

// Ініціалізація Cosmos DB клієнта
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
});
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Ініціалізація адаптера Bot Framework
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
});

// Пам'ять стану
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Створення сервера Restify
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
});

// Головний обробник повідомлень
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    await context.sendActivity('Вибачте, сталася помилка.');
};

// Простий бот, який приймає команду "add" і додає запис у Cosmos DB
server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            const text = context.activity.text.trim().toLowerCase();

            if (text.startsWith('add')) {
                // Приклад простої логіки додавання
                // Формат: add|title|author|year|category|region
                const parts = context.activity.text.split('|');
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
                        await context.sendActivity(`Запис "${newItem.title}" додано успішно!`);
                    } catch (err) {
                        console.error(err);
                        await context.sendActivity('Помилка при додаванні запису.');
                    }
                } else {
                    await context.sendActivity('Формат команди: add|title|author|year|category|region');
                }
            } else {
                await context.sendActivity('Привіт! Щоб додати запис, надішли повідомлення у форматі:\nadd|назва|автор|рік|категорія|регіон');
            }
        }
    });

});