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

module.exports = {
    async tgs2sticker(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        const docMsg = quoted?.documentMessage || msg.message?.documentMessage;
        if (!docMsg || !docMsg.fileName.endsWith('.tgs')) {
            return replyWithImage('⚠️ Veuillez répondre à un fichier sticker Telegram (.tgs).');
        }

        try {
            await replyWithImage('🔄 Conversion du sticker TGS en cours...');
            
            const targetMsg = quoted ? { message: quoted } : msg;
            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});

            const lottieJson = zlib.gunzipSync(buffer).toString('utf-8');
            const tempJsonPath = path.join(__dirname, '../temp', `temp_${Date.now()}.json`);
            const tempPngPath = path.join(__dirname, '../temp', `temp_${Date.now()}.png`);
            
            fs.writeFileSync(tempJsonPath, lottieJson);

            await renderLottie({
                lottiePath: tempJsonPath,
                outputPath: tempPngPath,
                width: 512,
                height: 512
            });

            const sticker = new Sticker(tempPngPath, {
                pack: '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺 Pack',
                author: '𝙺 𝙰 𝙽 𝙶  𝙹 𝙸 𝙽 𝙷 𝚈 𝚄 𝙺',
                type: StickerTypes.FULL,
                quality: 70
            });

            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

            if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
            if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath);
        } catch (err) {
            if (err?.code === 'MODULE_NOT_FOUND' && /canvas|lottie/.test(String(err))) {
                return replyWithImage('❌ canvas/lottie non installés sur ce serveur — commande .tgs indisponible ici.');
            }
            console.error(err);
            await replyWithImage('❌ Erreur lors de la conversion du fichier TGS.');
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
