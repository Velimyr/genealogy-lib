// bot/addHandler.js
const { startWizard } = require('./addWizard');

module.exports = async function handleAdd(context) {
    await startWizard(context);
};