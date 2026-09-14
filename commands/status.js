const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
    async handleAutoView(sock, msg) {
        try {
            await sock.readMessages([msg.key]);
            console.log(`👁️ Statut vu automatiquement de : ${msg.key.participant || msg.key.remoteJid}`);
        } catch (err) {
            console.error('Erreur Auto-view :', err);
        }
    },

    async saveStatus(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return replyWithImage('⚠️ Répondez au statut que vous souhaitez enregistrer avec .save');
        }

        try {
            const isImage = !!quoted.imageMessage;
            const isVideo = !!quoted.videoMessage;
            const isText = !!quoted.conversation || !!quoted.extendedTextMessage;

            const saveDir = path.join(__dirname, '../saved_statuses');
            const timestamp = Date.now();

            if (isImage || isVideo) {
                const ext = isImage ? 'jpg' : 'mp4';
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {});
                const filePath = path.join(saveDir, `status_${timestamp}.${ext}`);
                
                fs.writeFileSync(filePath, buffer);

                await sock.sendMessage(from, { 
                    [isImage ? 'image' : 'video']: buffer, 
                    caption: `✅ Statut enregistré avec succès dans saved_statuses/status_${timestamp}.${ext}` 
                }, { quoted: msg });

            } else if (isText) {
                const textContent = quoted.conversation || quoted.extendedTextMessage?.text;
                const filePath = path.join(saveDir, `status_${timestamp}.txt`);
                
                fs.writeFileSync(filePath, textContent);
                await replyWithImage(`✅ Statut texte sauvegardé :\n\n"${textContent}"`);
            } else {
                await replyWithImage('❌ Type de statut non pris en charge.');
            }
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Échec de la sauvegarde du statut.');
        }
    }
};
