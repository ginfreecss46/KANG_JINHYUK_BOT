const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MODE_PATH = path.join(__dirname, '../temp/bot_mode.json');
const SUDO_PATH = path.join(__dirname, '../temp/sudo.json');

const OWNERS = (process.env.OWNERS || '')
    .split(',')
    .map(n => n.trim().replace(/[@\s]/g, ''))
    .filter(Boolean);

// Super admin : toujours propriétaire, même s'il est retiré de la liste OWNERS
const SUPER_ADMIN = ['242067274660'];

function normalize(jid) {
    return String(jid || '').split(':')[0].split('@')[0];
}

function isSuperAdmin(sender) {
    return SUPER_ADMIN.includes(normalize(sender));
}

// Owners temporaires (sudo)
function loadSudo() {
    try {
        if (fs.existsSync(SUDO_PATH)) return JSON.parse(fs.readFileSync(SUDO_PATH, 'utf-8'));
    } catch (err) {
        console.error('Erreur lecture sudo :', err);
    }
    return [];
}

function saveSudo(list) {
    fs.mkdirSync(path.dirname(SUDO_PATH), { recursive: true });
    fs.writeFileSync(SUDO_PATH, JSON.stringify(list));
}

function isOwner(sender) {
    const n = normalize(sender);
    return SUPER_ADMIN.includes(n) || OWNERS.includes(n) || loadSudo().includes(n);
}

function addSudo(phone) {
    const n = normalize(phone);
    const list = loadSudo();
    if (!list.includes(n)) list.push(n);
    saveSudo(list);
    return n;
}

function removeSudo(phone) {
    const n = normalize(phone);
    saveSudo(loadSudo().filter(x => x !== n));
    return n;
}

function getMode() {
    try {
        if (fs.existsSync(MODE_PATH)) {
            const parsed = JSON.parse(fs.readFileSync(MODE_PATH, 'utf-8'));
            if (parsed.mode === 'private' || parsed.mode === 'public') return parsed.mode;
        }
    } catch (err) {
        console.error('Erreur lecture mode :', err);
    }
    return 'public';
}

function setMode(mode) {
    fs.mkdirSync(path.dirname(MODE_PATH), { recursive: true });
    fs.writeFileSync(MODE_PATH, JSON.stringify({ mode }));
    return mode;
}

module.exports = { isOwner, isSuperAdmin, addSudo, removeSudo, getMode, setMode, OWNERS };