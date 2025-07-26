const { store, resetSession, getSession } = require('../services/sessionStore');
const validUrl = require('valid-url');
const { publishMaterialCard, publishFileToTelegramChannel } = require('../services/telegramPublisher');
const { saveMaterial } = require('../services/db');
const handleMenu = require('./dialogManager');

async function startWizard(context) {
    const userId = [context.activity.from.id];
    resetSession(userId);
    store[userId].step = 1;

    await context.sendActivity({
        text: '📘 Введіть назву книги/статті (мовою оригіналу):',
        suggestedActions: {
            actions: [
                { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
            ],
            to: [context.activity.from.id]
        }
    });
}

// Динамічний імпорт node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Завантаження буфера файлу з contentUrl
async function getFileBuffer(contentUrl) {
    console.log('[DEBUG] Завантаження файлу з URL:', contentUrl);
    const response = await fetch(contentUrl);
    if (!response.ok) {
        console.error('[ERROR] Не вдалося завантажити файл. Код:', response.status, response.statusText);
        throw new Error('Не вдалося завантажити файл');
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log('[DEBUG] Розмір буфера (байт):', arrayBuffer.byteLength);
    return Buffer.from(arrayBuffer);
}

async function handleWizardStep(context) {
    const userId = context.activity.from.id;
    const session = getSession(userId);
    const text = context.activity.text?.trim();
    const lowerText = text?.toLowerCase();

    if (!session || session.step === 0) return false;

    if (lowerText === 'відмінити') {
        resetSession(userId);
        await context.sendActivity('❌ Додавання скасовано.');
        return true;
    }

    switch (session.step) {
        case 1:
            session.originalTitle = text;
            session.step = 2;
            await context.sendActivity({
                text: '🇺🇦 Введіть українську назву книги/статті:',
                suggestedActions: {
                    actions: [
                        { type: 'imBack', title: 'Назад', value: 'Назад' },
                        { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                    ],
                    to: [context.activity.from.id]
                }
            });
            return true;
        case 2:
            if (lowerText === 'назад') {
                session.step = 1;
                await context.sendActivity({
                    text: '📘 Введіть назву книги/статті (мовою оригіналу):',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            session.ukrTitle = text;
            session.step = 3;
            await context.sendActivity({
                text: '🧑‍💼 Введіть автора книги/статті:',
                suggestedActions: {
                    actions: [
                        { type: 'imBack', title: 'Назад', value: 'Назад' },
                        { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                    ],
                    to: [context.activity.from.id]
                }
            });
            return true;
        case 3:
            if (lowerText === 'назад') {
                session.step = 2;
                await context.sendActivity({
                    text: '🇺🇦 Введіть українську назву книги/статті:',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            session.author = text;
            session.step = 4;
            const categories = require('../data/categories.json');
            const buttons = categories.map(cat => ({
                type: 'imBack',
                title: cat,
                value: cat
            }));
            await context.sendActivity({
                text: '🗂️ Виберіть категорію книги/статті:',
                suggestedActions: {
                    actions: buttons,
                    to: [context.activity.from.id]
                }
            });
            return true;
        case 4:
            if (lowerText === 'назад') {
                session.step = 3;
                await context.sendActivity({
                    text: '🧑‍💼 Введіть автора книги/статті:',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            const cats = require('../data/categories.json');
            if (!cats.includes(text)) {
                await context.sendActivity('❗ Будь ласка, оберіть категорію із запропонованих кнопок.');
                return true;
            }
            session.category = text;
            session.step = 5;
            await context.sendActivity({
                text: '🧭 Введіть корисність для дослідника:',
                suggestedActions: {
                    actions: [
                        { type: 'imBack', title: 'Назад', value: 'Назад' },
                        { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                    ],
                    to: [context.activity.from.id]
                }
            });
            return true;
        case 5:
            if (lowerText === 'назад') {
                session.step = 4;
                const cats = require('../data/categories.json');
                const buttons = cats.map(cat => ({
                    type: 'imBack',
                    title: cat,
                    value: cat
                }));
                await context.sendActivity({
                    text: '🗂️ Виберіть категорію книги/статті:',
                    suggestedActions: {
                        actions: buttons,
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            session.usefulness = text;
            session.step = 6;
            await context.sendActivity({
                text: '🔗 Бажаєте надати посилання чи завантажити файл?',
                suggestedActions: {
                    actions: [
                        { type: 'imBack', title: 'Посилання', value: 'Посилання' },
                        { type: 'imBack', title: 'Завантажити файл', value: 'Завантажити файл' },
                        { type: 'imBack', title: 'Назад', value: 'Назад' },
                        { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                    ],
                    to: [context.activity.from.id]
                }
            });
            return true;
        case 6:
            if (lowerText === 'назад') {
                session.step = 5;
                await context.sendActivity({
                    text: '🧭 Введіть корисність для дослідника:',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            if (lowerText === 'посилання') {
                session.step = 7;
                await context.sendActivity({
                    text: '🔗 Введіть URL посилання на матеріал:',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            if (lowerText === 'завантажити файл') {
                session.step = 8;
                await context.sendActivity({
                    text: '📎 Будь ласка, надішліть файл (документ або зображення):',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            await context.sendActivity('❗ Будь ласка, оберіть "Посилання" або "Завантажити файл".');
            return true;
        case 7:
            if (lowerText === 'назад') {
                session.step = 6;
                await context.sendActivity({
                    text: '🔗 Бажаєте надати посилання чи завантажити файл?',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Посилання', value: 'Посилання' },
                            { type: 'imBack', title: 'Завантажити файл', value: 'Завантажити файл' },
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            if (!validUrl.isUri(text)) {
                await context.sendActivity('❗ Введено некоректний URL. Спробуйте ще раз.');
                return true;
            }
            session.link = text;
            session.step = 9;
            return await handleWizardStep(context);
        case 8:
            console.log('[DEBUG] activity at step 8:', JSON.stringify(context.activity, null, 2));
            if (context.activity.attachments && context.activity.attachments.length > 0) {
                const attachment = context.activity.attachments[0];
                console.log('[DEBUG] contentUrl вкладення:', attachment.contentUrl);
                session.fileAttachment = {
                    name: attachment.name,
                    contentType: attachment.contentType,
                    contentUrl: attachment.contentUrl
                };
                session.step = 9;
                await context.sendActivity({
                    text: '📄 Файл прийнято. Перевіряємо дані...',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Підтвердити', value: 'Підтвердити' },
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            if (lowerText === 'назад') {
                session.step = 6;
                await context.sendActivity({
                    text: '🔗 Бажаєте надати посилання чи завантажити файл?',
                    suggestedActions: {
                        actions: [
                            { type: 'imBack', title: 'Посилання', value: 'Посилання' },
                            { type: 'imBack', title: 'Завантажити файл', value: 'Завантажити файл' },
                            { type: 'imBack', title: 'Назад', value: 'Назад' },
                            { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                        ],
                        to: [context.activity.from.id]
                    }
                });
                return true;
            }
            await context.sendActivity('❗ Будь ласка, надішліть файл.');
            return true;
        case 9:
            let confirmText = `📚 Додано новий матеріал\n`;
            confirmText += `• Назва оригінал - ${session.originalTitle}\n`;
            confirmText += `• Назва укр.-  ${session.ukrTitle}\n`;
            confirmText += `• Автор - ${session.author}\n`;
            confirmText += `• Категорія - ${session.category}\n`;
            confirmText += `• Корисність - ${session.usefulness}\n`;
            if (session.link) {
                confirmText += `• Посилання - ${session.link}\n`;
            }
            if (session.fileAttachment) {
                confirmText += `• Файл - ${session.fileAttachment.name || 'Документ'}\n`;
            }
            if (lowerText === 'назад') {
                if (session.link) {
                    session.step = 7;
                    await context.sendActivity({
                        text: '🔗 Введіть URL посилання на матеріал:',
                        suggestedActions: {
                            actions: [
                                { type: 'imBack', title: 'Назад', value: 'Назад' },
                                { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                            ],
                            to: [context.activity.from.id]
                        }
                    });
                    return true;
                } else if (session.fileAttachment) {
                    session.step = 8;
                    await context.sendActivity({
                        text: '📎 Будь ласка, надішліть файл (документ або зображення):',
                        suggestedActions: {
                            actions: [
                                { type: 'imBack', title: 'Назад', value: 'Назад' },
                                { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                            ],
                            to: [context.activity.from.id]
                        }
                    });
                    return true;
                }
            }
            if (lowerText === 'підтвердити' || lowerText === 'далі') {
                try {
                    let materialData = {
                        originalTitle: session.originalTitle,
                        ukrTitle: session.ukrTitle,
                        author: session.author,
                        category: session.category,
                        usefulness: session.usefulness,
                        link: session.link || null,
                        fileAttachment: session.fileAttachment || null,
                        created_by: userId,
                        created_at: new Date().toISOString()
                    };

                    if (session.fileAttachment) {
                        console.log('[DEBUG] Починається публікація файлу в Telegram');
                        console.log('[DEBUG] Імʼя файлу:', session.fileAttachment.name);
                        console.log('[DEBUG] URL контенту:', session.fileAttachment.contentUrl);
                        try {
                            const fileBuffer = await getFileBuffer(session.fileAttachment.contentUrl);
                            const tgFileInfo = await publishFileToTelegramChannel(fileBuffer, session.fileAttachment, confirmText);
                            materialData.fileAttachment = {
                                telegramFileLink: tgFileInfo?.telegramFileLink || null,
                                name: session.fileAttachment.name || null
                            };
                        } catch (err) {
                            console.error('Помилка при публікації файлу у Telegram-канал:', err);
                            await context.sendActivity('❌ Не вдалося опублікувати файл у канал. Спробуйте пізніше або додайте матеріал без файлу.');
                            return true;
                        }
                    }
                    else if (session.link) {
                        await publishMaterialCard(materialData);
                    }
                    await saveMaterial(materialData);
                    resetSession(userId);
                    await context.sendActivity('✅ Книга/стаття успішно додана!');
                    await handleMenu(context);
                } catch (err) {
                    console.error('Помилка при додаванні матеріалу:', err);
                    await context.sendActivity('❌ Сталася помилка під час додавання. Спробуйте пізніше.');
                    await handleMenu(context);
                }
                return true;
            }
            await context.sendActivity({
                text: confirmText,
                textFormat: 'xml',
                suggestedActions: {
                    actions: [
                        { type: 'imBack', title: 'Підтвердити', value: 'Підтвердити' },
                        { type: 'imBack', title: 'Назад', value: 'Назад' },
                        { type: 'imBack', title: 'Відмінити', value: 'Відмінити' }
                    ],
                    to: [context.activity.from.id]
                }
            });
            return true;
        default:
            return false;
    }
}

module.exports = {
    startWizard,
    handleWizardStep
};