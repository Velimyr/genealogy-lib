const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const { Readable } = require('stream');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// Існуюча функція для публікації текстової картки
async function publishMaterialCard(session) {
    const lines = [
        '📚 Додано новий матеріал',
        `• Назва оригінал - ${session.originalTitle}`,
        `• Назва укр. -  ${session.ukrTitle}`,
        `• Автор - ${session.author}`,
        `• Категорія - ${session.category}`,
        `• Корисність - ${session.usefulness}`,
    ];

    if (session.link) {
        lines.push(`• Посилання - [Перейти до матеріалу]${session.link}`);
    } else if (session.fileAttachment?.name) {
        lines.push(`• Файл - ${session.fileAttachment.name}`);
    }

    const text = lines.join('\n');

    const payload = {
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: undefined
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
async function publishFileToTelegramChannel(fileBuffer, fileAttachment, caption = '') {
    if (!fileBuffer || !fileAttachment) {
        console.error('[ERROR] Відсутній буфер або вкладення:', { fileBuffer, fileAttachment });
        throw new Error("fileBuffer або fileAttachment не передано");
    }

    if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error("fileBuffer повинен бути Buffer");
    }

    console.log(`Відправляємо файл "${fileAttachment.name}" розміром ${fileBuffer.length} байт до Telegram`);
    console.log('[DEBUG] Telegram API URL:', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`);

    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHANNEL_ID);
    form.append('document', fileBuffer, {
        filename: fileAttachment.name || 'file',
        contentType: fileAttachment.contentType || 'application/octet-stream'
    });
    if (caption) {
        form.append('caption', caption);
    }

    const headers = form.getHeaders();
    headers['Content-Length'] = await new Promise((resolve, reject) => {
        form.getLength((err, length) => {
            if (err) reject(err);
            else resolve(length);
        });
    });

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: form,
        headers
    });

    const textBody = await res.text();
    console.log('[DEBUG] Відповідь від Telegram (textBody):', textBody);

    if (!res.ok) {
        throw new Error(`Telegram API error: ${res.status} ${res.statusText} - ${textBody}`);
    }

    let data;
    try {
        data = JSON.parse(textBody);
    } catch (e) {
        console.error('[ERROR] Неможливо розпарсити JSON:', e.message);
        throw new Error(`Invalid JSON response from Telegram API: ${e.message}`);
    }

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
        } else {
            console.error('[ERROR] Не вдалося отримати шлях до файлу Telegram:', fileData);
        }
    }

    fileAttachment.telegramFileLink = telegramFileLink;

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