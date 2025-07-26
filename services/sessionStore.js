// services/sessionStore.js

const store = {}; // In-memory сховище сесій

function getSession(userId) {
    if (!store[userId]) {
        store[userId] = { step: 0 };
    }
    return store[userId];
}

function resetSession(userId) {
    store[userId] = { step: 0 };
}

module.exports = {
    store,
    getSession,
    resetSession
};
