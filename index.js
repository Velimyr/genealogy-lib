const restify = require('restify');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();
const handleMenu = require('./bot/dialogManager');
const handleAdd = require('./bot/addHandler');
const { handleWizardStep } = require('./bot/addWizard'); // новий імпорт
const handleSearch = require('./bot/searchHandler');
const container = require('./services/db');

const requiredEnvVars = [
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY',
    'COSMOS_DB_DATABASE',
    'COSMOS_DB_CONTAINER',
    'MICROSOFT_APP_ID',
    'MICROSOFT_APP_PASSWORD'
];

requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
        console.error(`❌ Missing env variable: ${key}`);
        process.exit(1);
    }
});


// Ініціалізація адаптера Bot Framework
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
}); 
//const adapter = new BotFrameworkAdapter({});


// Пам'ять стану
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Створення сервера Restify
const server = restify.createServer();
server.listen(process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
});

// Головний обробник повідомлень
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    await context.sendActivity('Вибачте, сталася помилка.');
};


// Простий бот, який приймає команду "add" і додає запис у Cosmos DB
server.post('/api/messages', async (req, res) => {
    try {
        await adapter.processActivity(req, res, async (context) => {
            // Створюємо властивість для стану розмови
            const conversationData = conversationState.createProperty('conversationData');
            const convoData = await conversationData.get(context, { isWaitingForSearchQuery: false });

            if (context.activity.type === 'conversationUpdate') {
                const membersAdded = context.activity.membersAdded || [];
                for (let member of membersAdded) {
                    if (member.id !== context.activity.recipient.id) {
                        await handleMenu(context, '/start');
                    }
                }
                return;
            }

            if (context.activity.type === 'message') {
                const rawText = context.activity.text;
                const text = typeof rawText === 'string' ? rawText.trim() : '';
                const lowerText = text.toLowerCase();

                // Якщо зараз очікуємо пошукову фразу
                if (convoData.isWaitingForSearchQuery) {
                    const searchHandled = await handleSearch(context, text);
                    convoData.isWaitingForSearchQuery = false; // Скидаємо прапорець
                    await conversationState.saveChanges(context);
                    if (searchHandled) return;
                } else {
                    if (lowerText === 'пошук') {
                        await context.sendActivity('Введіть пошукову фразу:');
                        convoData.isWaitingForSearchQuery = true;
                        await conversationState.saveChanges(context);
                        return;
                    }

                    const searchHandled = await handleSearch(context);
                    if (searchHandled) return;

                    const handled = await handleWizardStep(context); // обробка кроків wizard
                    if (handled) return;

                    const hasUrl = lowerText && lowerText.match(/https?:\/\/\S+/);
                    const hasAttachment = context.activity.attachments?.length > 0;
                    if (hasUrl || hasAttachment) return;

                    if (lowerText === '/start' || lowerText === 'меню') {
                        await handleMenu(context, lowerText);
                    } else if (lowerText === 'додати книгу') {
                        await handleAdd(context);
                    } else if (lowerText?.startsWith('add')) {
                        await handleAdd(context);
                    } else if (lowerText) {
                        await context.sendActivity('Привіт! Щоб додати запис, надішли повідомлення у форматі:\nadd|назва|автор|рік|категорія|регіон');
                    } else {
                        await context.sendActivity('Очікую текстове повідомлення або вкладення.');
                    }
                }
            }
        });
    } catch (err) {
        console.error('❌ ПОМИЛКА у processActivity:', err);
        res.statusCode = 500;
        res.end();
    }
});