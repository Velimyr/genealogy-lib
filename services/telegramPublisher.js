const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// Існуюча функція для публікації текстової картки
async function publishMaterialCard(session) {
    const lines = [
        '📚 *Додано новий матеріал:*',
        `• Назва (оригінал): *${session.originalTitle}*`,
        `• Назва (укр.): *${session.ukrTitle}*`,
        `• Автор: *${session.author}*`,
        `• Категорія: *${session.category}*`,
        `• Корисність: *${session.usefulness}*`,
    ];

    if (session.link) {
        lines.push(`• Посилання: [Перейти до матеріалу](${session.link})`);
    } else if (session.fileAttachment?.name) {
        lines.push(`• Файл: *${session.fileAttachment.name}*`);
    }

    const text = lines.join('\n');

    const payload = {
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: 'Markdown'
    };

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) {
        throw new Error(`Telegram error: ${JSON.stringify(data)}`);
    }

    return {
        messageId: data.result.message_id,
        chatId: data.result.chat.id
    };
}

// Оновлена функція для публікації файлу в канал Telegram
async function publishFileToTelegramChannel(fileAttachment, caption = '') {
    if (!fileAttachment || !fileAttachment.contentUrl) {
        throw new Error("fileAttachment or fileAttachment.contentUrl is undefined");
    }
    const response = await fetch(fileAttachment.contentUrl);
    if (!response.ok) {
        throw new Error(`Не вдалося завантажити файл з ${fileAttachment.contentUrl}`);
    }
    const fileBuffer = await response.buffer();

    // Формуємо multipart/form-data
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHANNEL_ID);
    form.append('document', fileBuffer, {
        filename: fileAttachment.name,
        contentType: fileAttachment.contentType
    });
    if (caption) {
        form.append('caption', caption);
        form.append('parse_mode', 'Markdown');
    }

    // Відправляємо документ
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
    });

    const data = await res.json();
    if (!data.ok) {
        throw new Error(`Telegram error: ${JSON.stringify(data)}`);
    }

    const fileId = data.result.document?.file_id;
    let telegramFileLink = null;

    if (fileId) {
        const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();

        if (fileData.ok) {
            const filePath = fileData.result.file_path;
            telegramFileLink = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
        }
    }

    // Присвоюємо telegramFileLink у властивість fileAttachment, якщо таке існує
    if (fileAttachment) {
        fileAttachment.telegramFileLink = telegramFileLink;
    }

    return {
        messageId: data.result.message_id,
        chatId: data.result.chat.id,
        fileId: data.result.document.file_id,
        fileName: data.result.document.file_name,
        mimeType: data.result.document.mime_type,
        telegramFileLink: telegramFileLink
    };
}

module.exports = {
    publishMaterialCard,
    publishFileToTelegramChannel
};