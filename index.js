const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Import des modules de commandes
const adminCmds = require('./commands/admin');
const mediaCmds = require('./commands/media');
const statusCmds = require('./commands/status');
const { isOwner, isSuperAdmin, addSudo, removeSudo, getMode, setMode } = require('./commands/config');
const pairCmds = require('./commands/pair');
const webCmds = require('./commands/web');

let botMode = getMode();

// Serveur HTTP : page de connexion web (QR / pair code) + health check hébergeurs
const PORT = process.env.PORT || 3000;
http.createServer(webCmds.handle).listen(PORT, () => {
    console.log(`🌐 Serveur HTTP actif sur le port ${PORT} → page de connexion : http://localhost:${PORT}`);
});

// Dossiers requis
['temp', 'saved_statuses', 'assets'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Nom du bot avec police spéciale
const BOT_NAME = '𝆺𝅥⃝🍷 𝕶 𝕬 𝕹 𝕲  𝕵 𝕴 𝕹 𝕳 𝖄 𝖀 𝕶 𝆺𝅥⃝⚡';

// Signature ajoutée à l'exécution des commandes
const SIGNATURE = '\n━━━━━━━━━━━━\n🖋️ *𝔳𝔬𝔦𝔡_𝔰𝔱𝔦𝔩𝔢𝔰_𝔰𝔞𝔰𝔞𝔨𝔦*';

// Chemins vers les fichiers média locaux
const IMAGE_PATH = path.join(__dirname, 'assets/void_stiles.jpg');
const VIDEO_PATH = path.join(__dirname, 'assets/menu.mp4');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
    });

    webCmds.setSocket(sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            webCmds.setQr(qr);
            console.log('📱 Scannez ce QR code avec WhatsApp > Appareils connectés > Connecter un appareil :');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            webCmds.setConnected(false);
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            webCmds.setConnected(true);
            console.log(`🤖 ${BOT_NAME} connecté avec succès !`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        // Auto-view status
        if (from === 'status@broadcast') {
            await statusCmds.handleAutoView(sock, msg);
            return;
        }

        const isGroup = from.endsWith('@g.us');
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';

        if (!body.startsWith('.')) return;

        // Mode privé : seuls les propriétaires peuvent utiliser les commandes
        if (botMode === 'private' && !isOwner(senderJid)) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Helper pour envoyer un message avec l'image par défaut pour chaque commande
        const replyWithImage = async (caption, extraOptions = {}) => {
            const fullCaption = caption + SIGNATURE;
            if (fs.existsSync(IMAGE_PATH)) {
                return await sock.sendMessage(from, { image: fs.readFileSync(IMAGE_PATH), caption: fullCaption, ...extraOptions }, { quoted: msg });
            } else {
                return await sock.sendMessage(from, { text: fullCaption, ...extraOptions }, { quoted: msg });
            }
        };

        switch (command) {
            case 'ping':
                const startTime = Date.now();
                await replyWithImage(`🏓 *Pong !*\n⚡ Réponse en ${Date.now() - startTime}ms`);
                break;

            case 'pair':
                if (isOwner(senderJid)) await pairCmds.pair(sock, msg, args, replyWithImage);
                break;
            case 'delpair':
                if (isOwner(senderJid)) await pairCmds.delpair(sock, msg, args, replyWithImage);
                break;

            // Modes d'accès
            case 'private':
                if (isOwner(senderJid)) {
                    botMode = setMode('private');
                    await replyWithImage('🔒 Mode privé activé. Seuls les propriétaires peuvent utiliser les commandes.');
                } else {
                    await replyWithImage('🚫 Réservé au propriétaire du bot.');
                }
                break;
            case 'public':
                if (isOwner(senderJid)) {
                    botMode = setMode('public');
                    await replyWithImage('🌍 Mode public activé. Tout le monde peut utiliser les commandes.');
                } else {
                    await replyWithImage('🚫 Réservé au propriétaire du bot.');
                }
                break;

            // Affichage du Menu avec la Vidéo
            case 'menu':
            case 'help':
                const menuText = `
╔══════════════════════════════════╗
║                                  ║
║    ░▒▓█  K A N G  J I N H Y U K  █▓▒░
║                                  ║
║          ╳   J I N H Y U K  ╳    ║
║                                  ║
║     ━━━━ 𝙎𝙔𝙎𝙏𝙀𝙈 𝙊𝙉𝙇𝙄𝙉𝙀 ━━━━     ║
║                                  ║
║       [ BOT COMMAND CENTER ]     ║
║                                  ║
╚══════════════════════════════════╝

        ╱╲  𝟬𝟭  ╱╲
   ──────── ◈ ────────
        𝐌 𝐄 𝐃 𝐈 𝐀
   ──────── ◈ ────────

   ◈  .tgs
      └─ TGS  ══════▶  WEBP

   ◈  .play <titre>
      └─ YOUTUBE ════▶  AUDIO

   ◈  .take
      └─ STICKER ═══▶  RENAME

   ◈  .add
      └─ IMAGE ═════▶  STICKER


        ╱╲  𝟬𝟮  ╱╲
   ──────── ◈ ────────
        𝐒 𝐓 𝐀 𝐓 𝐔 𝐒
   ──────── ◈ ────────

   ◈  .autoview
      └─ STATUS  ═══▶  AUTO

   ◈  .save
      └─ STATUS  ═══▶  SAVED

   ◈  .ping
      └─ STATUS  ═══▶  ONLINE


        ╱╲  𝟬𝟯  ╱╲
   ──────── ◈ ────────
        𝐀 𝐃 𝐌 𝐈 𝐍
   ──────── ◈ ────────

   ◈  .tag <texte>
      └─ TARGET  ═══▶  GROUP

   ◈  .tagall
      └─ TARGET  ═══▶  ALL

   ◈  .kick @membre
      └─ ACTION  ═══▶  REMOVE

   ◈  .kickall
      └─ ACTION  ═══▶  CLEAN

   ◈  .purge
      └─ ACTION  ═══▶  EXILE

   ◈  .sasaki
      └─ DECLARE  ═▶  LEGION

   ◈  .sudo <numéro>
      └─ OWNER  ════▶  TEMP

   ◈  .delsudo <numéro>
      └─ OWNER  ════▶  REVOKE

   ◈  .promote @membre
      └─ ACCESS  ═══▶  ADMIN

   ◈  .demote @membre
      └─ ACCESS  ═══▶  REVOKE

   ◈  .reset
      └─ GROUP  ═══▶  REBOOT

        ╱╲  𝟬𝟰  ╱╲
   ──────── ◈ ────────
        𝐌 𝐎 𝐃 𝐄
   ──────── ◈ ────────

   ◈  .private
      └─ ACCESS  ═══▶  OWNER

   ◈  .public
      └─ ACCESS  ═══▶  ALL

   ◈  .pair <numéro>
      └─ LINK  ═════▶  CODE

   ◈  .delpair <numéro>
      └─ LINK  ═════▶  DELETE


╭──────────────────────────────────╮
│                                  │
│    ◈  K A N G  J I N H Y U K     │
│                                  │
│       [██████████] 100%          │
│                                  │
│       ⚡ SYSTEM OPERATIONAL       │
│       ◈ 23 COMMANDS LOADED       │
│                                  │
╰──────────────────────────────────╯
`;
                if (fs.existsSync(VIDEO_PATH)) {
                    await sock.sendMessage(from, {
                        video: fs.readFileSync(VIDEO_PATH),
                        caption: menuText + SIGNATURE,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                } else {
                    await replyWithImage(menuText);
                }
                break;

            // Media
            case 'tgs':
                await mediaCmds.tgs2sticker(sock, msg, replyWithImage);
                break;
            case 'play':
                await mediaCmds.play(sock, msg, args.join(' '), replyWithImage);
                break;
            case 'take':
                await mediaCmds.take(sock, msg, replyWithImage);
                break;
            case 'add':
                await mediaCmds.add(sock, msg, replyWithImage);
                break;

            // Statuts
            case 'save':
                await statusCmds.saveStatus(sock, msg, replyWithImage);
                break;

            // Admin Groupe
            case 'tag':
                if (isGroup) await adminCmds.tag(sock, msg, args, replyWithImage);
                break;
            case 'tagall':
                if (isGroup) await adminCmds.tagall(sock, msg, replyWithImage);
                break;
            case 'kick':
                if (isGroup) await adminCmds.kick(sock, msg, args, replyWithImage);
                break;
            case 'kickall':
                if (isGroup) await adminCmds.kickall(sock, msg, replyWithImage);
                break;
            case 'purge':
                if (isGroup) await adminCmds.purge(sock, msg, replyWithImage);
                break;
            case 'sasaki':
                if (isGroup) await adminCmds.sasaki(sock, msg, replyWithImage);
                break;
            case 'sudo':
                if (isSuperAdmin(senderJid)) {
                    if (!args[0]) {
                        await replyWithImage('ℹ️ Utilisation : .sudo <numéro>');
                    } else {
                        const n = addSudo(args[0]);
                        await replyWithImage(`🔓 ${n} ajouté en tant qu'owner temporaire (sudo).`);
                    }
                } else {
                    await replyWithImage('🚫 Réservé au super admin.');
                }
                break;
            case 'delsudo':
                if (isSuperAdmin(senderJid)) {
                    if (!args[0]) {
                        await replyWithImage('ℹ️ Utilisation : .delsudo <numéro>');
                    } else {
                        const n = removeSudo(args[0]);
                        await replyWithImage(`🔒 ${n} retiré des owners temporaires.`);
                    }
                } else {
                    await replyWithImage('🚫 Réservé au super admin.');
                }
                break;
            case 'promote':
                if (isGroup) await adminCmds.promote(sock, msg, args, replyWithImage);
                break;
            case 'demote':
                if (isGroup) await adminCmds.demote(sock, msg, args, replyWithImage);
                break;
            case 'reset':
                if (isGroup) await adminCmds.resetGroup(sock, msg, replyWithImage);
                break;
        }
    });
}

startBot();
