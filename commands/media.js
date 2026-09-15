const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

let _tgs = null;

function getTgs() {
    if (_tgs) return _tgs;
    const canvas = require('canvas');
    global.navigator = { userAgent: 'node' };
    global.window = global;
    global.document = {
        createElement: (type) => {
            if (type === 'canvas') return canvas.createCanvas(512, 512);
            return {};
        },
        getElementsByTagName: () => [],
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { appendChild: () => {}, removeChild: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {},
        createElementNS: () => ({}),
        location: null
    };
    const lottie = require('lottie-web/build/player/lottie_canvas.js');
    _tgs = { canvas, createCanvas: canvas.createCanvas, lottie };
    return _tgs;
}

async function renderLottie({ lottiePath, outputPath, width, height }) {
    const { createCanvas, lottie } = getTgs();
    const json = JSON.parse(fs.readFileSync(lottiePath, 'utf-8'));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const anim = lottie.loadAnimation({
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        animationData: json,
        rendererSettings: { context: ctx }
    });

    return new Promise((resolve, reject) => {
        try {
            anim.goToAndStop(0, true);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);
            resolve();
        } catch (e) {
            reject(e);
        } finally {
            anim.destroy();
        }
    });
}

const https = require('https');

function tgRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error('Telegram HTTP ' + res.statusCode));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

const PACK = '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺 Pack';
const AUTHOR = '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺';

function tgsBox(title, lines) {
    const s = '🕸️';
    const top = s + '━━━〔 ' + title + ' 〕━━━' + s;
    const mid = lines.map(l => '│  ' + l).join('\n');
    const bottom = s + '━'.repeat(34) + s;
    return `${top}\n${mid}\n${bottom}`;
}

async function fetchStickerSet(url) {
    const name = url.match(/addstickers\/([A-Za-z0-9_]+)/)?.[1];
    if (!name) throw new Error('Lien de pack invalide');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN manquant dans .env');
    const setRes = await tgRequest(`https://api.telegram.org/bot${token}/getStickerSet?name=${name}`);
    const set = JSON.parse(setRes.toString('utf-8'));
    if (!set.ok) throw new Error('Pack introuvable : ' + (set.description || 'invalide'));
    return { name, title: set.result.title || name, stickers: set.result.stickers || [] };
}

async function getStickerFile(sticker) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const fileRes = await tgRequest(`https://api.telegram.org/bot${token}/getFile?file_id=${sticker.file_id}`);
    const file = JSON.parse(fileRes.toString('utf-8'));
    if (!file.ok) throw new Error('Fichier introuvable');
    const buffer = await tgRequest(`https://api.telegram.org/file/bot${token}/${file.result.file_path}`);
    return { buffer, animated: !!sticker.is_animated, video: !!sticker.is_video };
}

async function toStickerBuffer(buffer, animated) {
    if (animated) {
        const lottieJson = zlib.gunzipSync(buffer).toString('utf-8');
        const tempJsonPath = path.join(__dirname, '../temp', `temp_${Date.now()}.json`);
        const tempPngPath = path.join(__dirname, '../temp', `temp_${Date.now()}.png`);
        fs.writeFileSync(tempJsonPath, lottieJson);
        try {
            await renderLottie({ lottiePath: tempJsonPath, outputPath: tempPngPath, width: 512, height: 512 });
            const sticker = new Sticker(tempPngPath, { pack: PACK, author: AUTHOR, type: StickerTypes.FULL, quality: 70 });
            return await sticker.toBuffer();
        } finally {
            if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
            if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath);
        }
    }
    const sticker = new Sticker(buffer, { pack: PACK, author: AUTHOR, type: StickerTypes.FULL, quality: 70 });
    return await sticker.build();
}

module.exports = {
    async tgs2sticker(sock, msg, replyWithImage, args = [], isOwnerCaller = false) {
        const from = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const arg = String(args[0] || '');
        const send = (text) => sock.sendMessage(from, { text }, { quoted: msg });

        try {
            if (/t\.me\/addstickers\//.test(arg)) {
                const mode = String(args[1] || 'all').toLowerCase();
                const packName = arg.match(/addstickers\/([A-Za-z0-9_]+)/)?.[1] || 'PACK';

                await send(tgsBox('🕸️ 𝐓𝐈𝐒𝐒𝐀𝐆𝐄 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒', ['Récupération du pack ' + packName + '...']));

                const set = await fetchStickerSet(arg);
                const all = set.stickers;
                const animated = all.filter(s => s.is_animated).length;
                const staticCount = all.filter(s => !s.is_animated && !s.is_video).length;
                const video = all.filter(s => s.is_video).length;

                let targets;
                if (mode === 'full') {
                    if (!isOwnerCaller) return send('🚫 Réservé au propriétaire du bot.');
                    targets = all;
                } else if (mode === 'all') {
                    targets = all.slice(0, 10);
                } else if (/^\d+$/.test(mode)) {
                    const n = parseInt(mode, 10);
                    if (n < 1 || n > all.length) return send('⚠️ Numéro invalide (1 à ' + all.length + ').');
                    targets = [all[n - 1]];
                } else {
                    targets = all.slice(0, 10);
                }

                await send(tgsBox('📦 ' + packName, [
                    '',
                    '🎨 ' + all.length + ' stickers',
                    '✨ animés : ' + animated,
                    '🖼️ statiques : ' + staticCount,
                    '🎬 vidéo : ' + video,
                    '',
                    '💡 .tgs <lien> <numéro> — un sticker précis',
                    '💡 .tgs <lien> all — les 10 premiers',
                    '💡 .tgs <lien> full — le pack complet'
                ]));

                let sent = 0;
                for (let i = 0; i < targets.length; i++) {
                    try {
                        const { buffer, animated: anim, video: vid } = await getStickerFile(targets[i]);
                        if (vid) {
                            await sock.sendMessage(from, { video: buffer, gifPlayback: true }, { quoted: msg });
                        } else {
                            const sb = await toStickerBuffer(buffer, anim);
                            await sock.sendMessage(from, { sticker: sb }, { quoted: msg });
                        }
                        sent++;
                    } catch (e) {
                        console.error('Sticker #' + (i + 1) + ' :', e);
                    }
                }

                const rest = all.length - targets.length;
                await send(tgsBox('✅ 𝐓𝐄𝐑𝐌𝐈𝐍É', [
                    '',
                    sent + '/' + targets.length + ' stickers importés.',
                    'Pack : ' + set.title,
                    rest > 0 ? '📄 ' + rest + ' autres — .tgs <lien> full (owner).'
                            : '🗂️ Pack complet importé.'
                ]));
                return;
            }

            const docMsg = quoted?.documentMessage || msg.message?.documentMessage;
            if (!docMsg || !docMsg.fileName.endsWith('.tgs')) {
                return replyWithImage('⚠️ Usage : .tgs <lien t.me/addstickers/...> ou répondez à un fichier sticker .tgs.');
            }

            await replyWithImage('🔄 Conversion du sticker TGS en cours...');
            const buffer = await downloadMediaMessage(quoted ? { message: quoted } : msg, 'buffer', {});
            const stickerBuffer = await toStickerBuffer(buffer, true);
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
        } catch (err) {
            if (err?.code === 'MODULE_NOT_FOUND' && /canvas|lottie/.test(String(err))) {
                return replyWithImage('❌ canvas/lottie non installés sur ce serveur — commande .tgs indisponible ici.');
            }
            console.error(err);
            await replyWithImage('❌ Erreur lors de la conversion du sticker TGS.');
        }
    },

    async take(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;

        if (!stickerMsg) {
            return replyWithImage('⚠️ Répondez au sticker que vous voulez renommer.');
        }

        try {
            const name = msg.pushName || 'void_stiles sasaki';
            const targetMsg = quoted ? { message: quoted } : msg;
            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});

            const sticker = new Sticker(buffer, {
                pack: name,
                author: name,
                type: StickerTypes.DEFAULT,
                quality: 100
            });

            const stickerBuffer = await sticker.build();
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Erreur lors du renommage du sticker.');
        }
    },

    async s(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

        if (!imageMsg) {
            return replyWithImage('⚠️ Répondez à une image pour la transformer en sticker.');
        }

        try {
            const name = msg.pushName || 'void_stiles sasaki';
            const targetMsg = quoted ? { message: quoted } : msg;
            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});

            const sticker = new Sticker(buffer, {
                pack: name,
                author: name,
                type: StickerTypes.FULL,
                quality: 80
            });

            const stickerBuffer = await sticker.build();
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Erreur lors de la création du sticker.');
        }
    },

    async play(sock, msg, query, replyWithImage) {
        if (!query) {
            return replyWithImage('⚠️ Donnez un titre ou une recherche YouTube. Ex: .play Lofi hip hop');
        }

        try {
            await replyWithImage(`🔍 Recherche de "${query}"...`);
            
            const searchResult = await yts(query);
            const video = searchResult.videos[0];

            if (!video) {
                return replyWithImage('❌ Aucun résultat trouvé sur YouTube.');
            }

            const tempAudioPath = path.join(__dirname, '../temp', `${video.videoId}.mp3`);
            
            const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
            const fileStream = fs.createWriteStream(tempAudioPath);

            stream.pipe(fileStream);

            fileStream.on('finish', async () => {
                await sock.sendMessage(msg.key.remoteJid, {
                    audio: fs.readFileSync(tempAudioPath),
                    mimetype: 'audio/mp4',
                    fileName: `${video.title}.mp3`
                }, { quoted: msg });

                if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
            });
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Erreur lors du téléchargement de la musique.');
        }
    }
};
