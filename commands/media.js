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

function ensureTempDir() {
    const dir = path.join(__dirname, '../temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function parsePackName(url) {
    return String(url || '').match(/addstickers\/([A-Za-z0-9_]+)/)?.[1] || null;
}

const https = require('https');
const { spawn, spawnSync } = require('child_process');

function tgRequest(url) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const get = (u) => {
            const req = https.get(u, (res) => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && attempts < 3) {
                    res.resume();
                    attempts++;
                    return get(new URL(res.headers.location, u).toString());
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error('Telegram HTTP ' + res.statusCode));
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.setTimeout(30000, () => req.destroy(new Error('timeout ' + u)));
            req.on('error', reject);
        };
        get(url);
    });
}

function detectTgsFormat(buffer) {
    if (!buffer || buffer.length === 0) return 'empty';
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) return 'tgs';
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'webm';
    return 'unknown';
}

let _ffmpegOk = null;
function ffmpegAvailable() {
    if (_ffmpegOk === null) {
        try { _ffmpegOk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', timeout: 5000 }).status === 0; }
        catch (e) { _ffmpegOk = false; }
    }
    return _ffmpegOk;
}

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: 'ignore' });
        p.once('error', reject);
        p.once('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code))));
    });
}

const PACK = '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺 Pack';
const AUTHOR = '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺';

function tgsBox(title, lines) {
    const s = '👻';
    const top = s + '━━━〔 ' + title + ' 〕━━━' + s;
    const mid = lines.map(l => '│  ' + l).join('\n');
    const bottom = s + '━'.repeat(34) + s;
    return `${top}\n${mid}\n${bottom}`;
}

async function fetchStickerSet(url) {
    const name = parsePackName(url);
    if (!name) throw new Error('Lien de pack invalide');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN manquant dans .env');
    const setRes = await tgRequest(`https://api.telegram.org/bot${token}/getStickerSet?name=${name}`);
    const set = JSON.parse(setRes.toString('utf-8'));
    if (!set.ok) throw new Error('Pack introuvable : ' + (set.description || 'invalide'));
    return { name, title: set.result.title || name, stickers: set.result.stickers || [] };
}

async function toStickerBuffer(buffer, animated) {
    if (animated) {
        const lottieJson = zlib.gunzipSync(buffer).toString('utf-8');
        JSON.parse(lottieJson);
        const rnd = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const tempJsonPath = path.join(ensureTempDir(), `temp_${rnd}.json`);
        const tempPngPath = path.join(ensureTempDir(), `temp_${rnd}.png`);
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

async function pickSmallestWebp(attempts) {
    let best = null;
    let bestLen = Infinity;
    for (const { args, out } of attempts) {
        try {
            await runFfmpeg(args);
            if (!fs.existsSync(out)) continue;
            const buf = fs.readFileSync(out);
            if (!buf.length) continue;
            if (buf.length <= 220 * 1024) return buf;
            if (buf.length < bestLen) { bestLen = buf.length; best = buf; }
        } catch (e) {
            console.error('[TGS] encodage ffmpeg échoué :', e.message);
        }
    }
    if (best && bestLen <= 256 * 1024) return best;
    throw new Error('sticker animé trop volumineux');
}

function errMsg(e) {
    if (!e) return 'erreur inconnue';
    if (Array.isArray(e.errors) && e.errors.length) return e.errors[0].message || String(e.errors[0]);
    if (e.message) return e.message;
    return String(e);
}

async function withRetry(fn, tries = 3) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        try { return await fn(); }
        catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1200)); }
    }
    throw lastErr;
}

async function renderAnimatedSticker(lottieJson) {
    const { createCanvas, lottie } = getTgs();
    const json = JSON.parse(lottieJson);
    const base = path.join(ensureTempDir(), 'tgsan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    fs.mkdirSync(base, { recursive: true });
    let anim = null;
    try {
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');
        anim = lottie.loadAnimation({
            renderer: 'canvas',
            loop: false,
            autoplay: false,
            animationData: json,
            rendererSettings: { context: ctx }
        });
        const total = Math.max(1, Math.floor(anim.totalFrames || (json.op - json.ip) || 30));
        const n = Math.max(2, Math.min(total, 12));
        for (let i = 0; i < n; i++) {
            anim.goToAndStop(Math.floor(total * i / (n - 1)), true);
            fs.writeFileSync(path.join(base, `f_${i}.png`), canvas.toBuffer('image/png'));
            await new Promise(r => setTimeout(r, 15));
        }
        anim.destroy();
        anim = null;
        const attempts = [];
        for (const conf of [
            { scale: 512, q: 80 }, { scale: 512, q: 60 }, { scale: 448, q: 50 }, { scale: 384, q: 42 },
            { scale: 320, q: 38 }, { scale: 256, q: 35 }
        ]) {
            const out = path.join(base, `o_${conf.scale}_${conf.q}.webp`);
            const vf = `scale=${conf.scale}:${conf.scale}:force_original_aspect_ratio=decrease,pad=${conf.scale}:${conf.scale}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
            attempts.push({
                out,
                args: [
                    '-y', '-start_number', '0',
                    '-framerate', '10',
                    '-f', 'image2', '-i', path.join(base, 'f_%d.png'),
                    '-vf', vf,
                    '-c:v', 'libwebp_anim', '-q:v', String(conf.q),
                    out
                ]
            });
        }
        return await pickSmallestWebp(attempts);
    } finally {
        if (anim) anim.destroy();
        fs.rmSync(base, { recursive: true, force: true });
    }
}

async function webmToSticker(webmBuffer) {
    if (!ffmpegAvailable()) throw new Error('ffmpeg indisponible sur ce serveur (requis pour les stickers vidéo/animés)');
    const base = path.join(ensureTempDir(), 'tgsvid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    fs.mkdirSync(base, { recursive: true });
    try {
        const input = path.join(base, 'in.webm');
        fs.writeFileSync(input, webmBuffer);
        const attempts = [];
        for (const conf of [
            { s: 512, q: 70, fps: 15 }, { s: 480, q: 55, fps: 12 }, { s: 384, q: 45, fps: 9 },
            { s: 320, q: 38, fps: 7 }, { s: 256, q: 35, fps: 5 }
        ]) {
            const out = path.join(base, `o_${conf.s}_${conf.q}_${conf.fps}.webp`);
            const vf = `fps=${conf.fps},scale=${conf.s}:${conf.s}:force_original_aspect_ratio=decrease,pad=${conf.s}:${conf.s}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
            attempts.push({ out, args: ['-y', '-i', input, '-an', '-vf', vf, '-c:v', 'libwebp_anim', '-q:v', String(conf.q), out] });
        }
        return await pickSmallestWebp(attempts);
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
}

async function animatedStickerBuffer(tgsBuffer) {
    let lottieJson;
    try {
        lottieJson = zlib.gunzipSync(tgsBuffer).toString('utf-8');
        JSON.parse(lottieJson);
    } catch (e) {
        throw new Error('TGS invalide (gzip/JSON)');
    }
    if (ffmpegAvailable()) {
        try {
            return await renderAnimatedSticker(lottieJson);
        } catch (e) {
            console.error('[TGS] rendu animé échoué, repli statique :', e.message);
        }
    }
    return await toStickerBuffer(tgsBuffer, true);
}

async function importSticker(sock, from, msg, sticker, globalIndex) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const log = (...m) => console.log('[TGS] [N°' + globalIndex + ']', ...m);
    let dlOk = false;
    try {
        log('fichier récupéré (getFile)…');
        const fileRes = await withRetry(() => tgRequest(`https://api.telegram.org/bot${token}/getFile?file_id=${sticker.file_id}`));
        const file = JSON.parse(fileRes.toString('utf-8'));
        if (!file.ok) {
            log('échec → introuvable (API Telegram)');
            return { ok: false, downloaded: false, reason: 'introuvable (API Telegram)' };
        }
        const fp = file.result.file_path;
        log('téléchargement commencé →', fp);
        const buffer = await withRetry(() => tgRequest(`https://api.telegram.org/file/bot${token}/${fp}`));
        if (!buffer || buffer.length === 0) {
            log('échec → téléchargement vide (0 octet)');
            return { ok: false, downloaded: false, reason: 'téléchargement vide' };
        }
        dlOk = true;
        log('téléchargement terminé →', buffer.length, 'octets');

        const expected = sticker.is_video ? 'webm' : sticker.is_animated ? 'tgs' : 'webp';
        const fmt = detectTgsFormat(buffer);
        if (fmt !== expected) {
            log(`échec → validation : format ${fmt}, attendu ${expected}`);
            return { ok: false, downloaded: true, reason: `format ${fmt} (attendu ${expected})` };
        }
        log('validation →', fmt, 'OK');

        log('import commencé');
        let content;
        if (sticker.is_video) {
            content = { sticker: await webmToSticker(buffer) };
        } else if (sticker.is_animated) {
            content = { sticker: await animatedStickerBuffer(buffer) };
        } else {
            content = { sticker: await toStickerBuffer(buffer, false) };
        }
        await sock.sendMessage(from, content, { quoted: msg });
        log('import réussi');
        return { ok: true, downloaded: true };
    } catch (e) {
        log('import échoué →', errMsg(e));
        return { ok: false, downloaded: dlOk, reason: errMsg(e).slice(0, 70) };
    }
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
                const packName = parsePackName(arg) || 'PACK';

                console.log('[TGS] PACK URL →', arg);
                await send(tgsBox('⏳ 𝐓𝐈𝐒𝐒𝐀𝐆𝐄 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒', ['Récupération du pack ' + packName + '...']));

                const set = await fetchStickerSet(arg);
                const all = set.stickers;
                console.log('[TGS] pack détecté →', set.name, '(' + all.length + ' stickers )');

                const animCount = all.filter(s => s.is_animated).length;
                const statCount = all.filter(s => !s.is_animated && !s.is_video).length;
                const vidCount = all.filter(s => s.is_video).length;

                let targets;
                let reqLabel;
                if (mode === 'full') {
                    if (!isOwnerCaller) return send('🚫 full réservé au propriétaire du bot.');
                    targets = all;
                    reqLabel = '🎯 Pack complet (' + all.length + ')';
                } else if (/^\d+$/.test(mode)) {
                    const n = parseInt(mode, 10);
                    if (n < 1 || n > all.length) return send('⚠️ Numéro invalide (1 à ' + all.length + ').');
                    targets = [all[n - 1]];
                    reqLabel = '🎯 Sticker N°' + n;
                } else {
                    targets = all.slice(0, 10);
                    reqLabel = '🎯 Les 10 premiers';
                }
                console.log('[TGS] sticker demandé →', reqLabel);

                await send(tgsBox('📦 ' + set.name, [
                    '',
                    '🎨 ' + all.length + ' stickers',
                    '✨ animés : ' + animCount,
                    '🖼️ statiques : ' + statCount,
                    '🎬 vidéo : ' + vidCount,
                    '',
                    reqLabel
                ]));

                let imported = 0;
                let downloaded = 0;
                const fails = [];
                for (let i = 0; i < targets.length; i++) {
                    const realIndex = all.indexOf(targets[i]) + 1;
                    const r = await importSticker(sock, from, msg, targets[i], realIndex);
                    if (r.downloaded) downloaded++;
                    if (r.ok) imported++;
                    else fails.push({ index: realIndex, reason: r.reason });
                }

                const lines = [
                    '',
                    '📦 Pack : ' + set.title,
                    '🎨 Stickers trouvés : ' + all.length,
                    '⬇️ Téléchargés : ' + downloaded,
                    '✅ Importés : ' + imported,
                    '❌ Échecs : ' + fails.length
                ];
                if (fails.length) {
                    lines.push('');
                    fails.forEach(f => lines.push('❌ N°' + f.index + ' : ' + f.reason));
                }

                await send(tgsBox('✅ 𝐓𝐄𝐑𝐌𝐈𝐍É', lines));
                return;
            }

            const docMsg = quoted?.documentMessage || msg.message?.documentMessage;
            if (!docMsg || !docMsg.fileName.endsWith('.tgs')) {
                return replyWithImage('⚠️ Usage : .tgs <lien t.me/addstickers/...> ou répondez à un fichier sticker .tgs.');
            }

            await replyWithImage('🔄 Conversion du sticker TGS en cours...');
            const buffer = await downloadMediaMessage(quoted ? { message: quoted } : msg, 'buffer', {});
            if (!buffer || buffer.length === 0) throw new Error('fichier .tgs vide');
            const stickerBuffer = await animatedStickerBuffer(buffer);
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
        } catch (err) {
            if (err?.code === 'MODULE_NOT_FOUND' && /canvas|lottie/.test(String(err))) {
                return replyWithImage('❌ canvas/lottie non installés sur ce serveur — commande .tgs indisponible ici.');
            }
            console.error(err);
            await replyWithImage('❌ ' + ((err && err.message) ? err.message : 'Erreur lors de la conversion du sticker TGS.'));
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
