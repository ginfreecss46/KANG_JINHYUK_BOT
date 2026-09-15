const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules', 'temp', 'saved_statuses', 'auth_info_baileys', '.git']);
const WATCH_EXT = ['.js', '.json', '.env'];

let child = null;
let restartTimer = null;
let crashCount = 0;
let lastStart = 0;

function startBot() {
    const now = Date.now();
    if (now - lastStart < 10000) crashCount++;
    else crashCount = 0;
    lastStart = now;

    const delay = crashCount >= 5 ? 10000 : 800;

    child = spawn('node', ['index.js'], { stdio: 'inherit' });
    child.on('exit', (code, signal) => {
        console.log(`\n🔄 Processus du bot arrêté (code: ${code}, signal: ${signal}) — redémarrage dans ${delay}ms`);
        setTimeout(startBot, delay);
    });
}

function shouldWatch(filePath) {
    const parts = filePath.split(path.sep);
    if (parts.some(p => IGNORE_DIRS.has(p))) return false;
    const ext = path.extname(filePath);
    if (!WATCH_EXT.includes(ext)) return false;
    if (path.basename(filePath) === 'watcher.js') return false;
    return true;
}

function restart(filePath) {
    if (restartTimer) clearTimeout(restartTimer);
    console.log(`👀 Changement détecté sur : ${filePath}`);
    restartTimer = setTimeout(() => {
        console.log('📦 Changement détecté, redémarrage du bot avec les dernières mises à jour...');
        if (child) child.kill('SIGKILL');
    }, 500);
}

function walk(dir) {
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (IGNORE_DIRS.has(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(fullPath);
            else if (shouldWatch(fullPath)) fs.watchFile(fullPath, { interval: 700 }, () => restart(fullPath));
        }
    } catch (err) {
        console.error('Erreur scan:', err);
    }
}

console.log('👁️  Watch mode activé — les modifications du code seront appliquées automatiquement.');
walk(__dirname);
startBot();