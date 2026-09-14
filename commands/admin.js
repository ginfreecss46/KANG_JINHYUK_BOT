const fs = require('fs');
const path = require('path');
const { isOwner } = require('./config');

const SASAKI_TEXT = `━━━━━━━━━━━━━━━━━━━━
𝕬𝕶𝕬𝕾𝕳𝕴 𝕾𝕬𝕾𝕬𝕶𝕴
𝕷𝖊 𝕾𝖔𝖚𝖛𝖊𝖗𝖆𝖎𝖓 𝖉𝖊 𝖑𝖆 𝕷𝖊́𝖌𝖎𝖔𝖓
━━━━━━━━━━━━━━━━━━━━
「𝕷𝖆 𝖕𝖚𝖗𝖌𝖊 𝖛𝖆 𝖈𝖔𝖒𝖒𝖊𝖓𝖈𝖊𝖗.」

𝕴𝖑 𝖋𝖚𝖙 𝖚𝖓 𝖙𝖊𝖒𝖕𝖘 𝖔𝖚̀ 𝖓𝖔𝖙𝖗𝖊 𝖓𝖔𝖒 𝖘𝖚𝖋𝖋𝖎𝖘𝖆𝖎𝖙 𝖆̀ 𝖎𝖒𝖕𝖔𝖘𝖊𝖗 𝖑𝖊 𝖘𝖎𝖑𝖊𝖓𝖈𝖊. 𝕬𝖚𝖏𝖔𝖚𝖗𝖉'𝖍𝖚𝖎, 𝖈𝖊𝖗𝖙𝖆𝖎𝖓𝖘 𝖔𝖓𝖙 𝖔𝖚𝖇𝖑𝖎𝖊́ 𝖈𝖊 𝖖𝖚𝖎 𝖘𝖎𝖌𝖓𝖎𝖋𝖎𝖊 𝖘𝖊 𝖉𝖗𝖊𝖘𝖘𝖊𝖗 𝖋𝖆𝖈𝖊 𝖆̀ 𝖚𝖓 𝕾𝖆𝖘𝖆𝖐𝖎.

𝕷𝖆 𝖕𝖆𝖙𝖎𝖊𝖓𝖈𝖊 𝖉𝖚 𝕾𝖔𝖚𝖛𝖊𝖗𝖆𝖎𝖓 𝖙𝖔𝖚𝖈𝖍𝖊 𝖆̀ 𝖘𝖆 𝖋𝖎𝖓. 𝕮𝖊𝖙𝖙𝖊 𝖋𝖔𝖎𝖘, 𝖓𝖔𝖚𝖘 𝖓𝖊 𝖛𝖊𝖓𝖔𝖓𝖘 𝖕𝖆𝖘 𝖕𝖔𝖚𝖗 𝖕𝖆𝖗𝖑𝖊𝖗. 𝕹𝖔𝖚𝖘 𝖛𝖊𝖓𝖔𝖓𝖘 𝖕𝖔𝖚𝖗 𝖗𝖊́𝖙𝖆𝖇𝖑𝖎𝖗 𝖑'𝖔𝖗𝖉𝖗𝖊.

𝕮𝖊𝖈𝖎 𝖓'𝖊𝖘𝖙 𝖕𝖆𝖘 𝖚𝖓𝖊 𝖌𝖚𝖊𝖗𝖗𝖊. 𝕮𝖊 𝖓'𝖊𝖘𝖙 𝖕𝖆𝖘 𝖚𝖓𝖊 𝖒𝖊𝖓𝖆𝖈𝖊. 𝕮'𝖊𝖘𝖙 𝖚𝖓 𝖏𝖚𝖌𝖊𝖒𝖊𝖓𝖙.

𝕷𝖆 𝕷𝖊́𝖌𝖎𝖔𝖓 𝕾𝖆𝖘𝖆𝖐𝖎 𝖘𝖊 𝖗𝖊́𝖛𝖊𝖎𝖑𝖑𝖊 𝖘𝖔𝖚𝖘 𝖑'𝖆𝖚𝖙𝖔𝖗𝖎𝖙𝖊́ 𝖉𝖚 𝕾𝖔𝖚𝖛𝖊𝖗𝖆𝖎𝖓.

𝕬𝖚𝖈𝖚𝖓𝖊 𝖉𝖎𝖛𝖎𝖘𝖎𝖔𝖓. 𝕬𝖚𝖈𝖚𝖓𝖊 𝖍𝖊́𝖘𝖎𝖙𝖆𝖙𝖎𝖔𝖓. 𝕬𝖚𝖈𝖚𝖓 𝖗𝖊𝖙𝖔𝖚𝖗 𝖊𝖓 𝖆𝖗𝖗𝖎𝖊̀𝖗𝖊.

𝕮𝖍𝖆𝖖𝖚𝖊 𝖒𝖊𝖒𝖇𝖗𝖊 𝖕𝖔𝖗𝖙𝖊 𝖑𝖊 𝖓𝖔𝖒 𝕾𝖆𝖘𝖆𝖐𝖎 𝖈𝖔𝖒𝖒𝖊 𝖚𝖓 𝖘𝖊𝖗𝖒𝖊𝖓𝖙. 𝕹𝖔𝖙𝖗𝖊 𝖋𝖔𝖗𝖈𝖊 𝖓𝖊 𝖗𝖊́𝖘𝖎𝖉𝖊 𝖕𝖆𝖘 𝖉𝖆𝖓𝖘 𝖚𝖓 𝖘𝖊𝖚𝖑 𝖎𝖓𝖉𝖎𝖛𝖎𝖉𝖚, 𝖒𝖆𝖎𝖘 𝖉𝖆𝖓𝖘 𝖑'𝖚𝖓𝖎𝖙𝖊́ 𝖉𝖊 𝖑𝖆 𝕷𝖊́𝖌𝖎𝖔𝖓.

𝕸𝖔𝖎, 𝕬𝖐𝖆𝖘𝖍𝖎 𝕾𝖆𝖘𝖆𝖐𝖎, 𝕾𝖔𝖚𝖛𝖊𝖗𝖆𝖎𝖓 𝖉𝖊 𝖈𝖊𝖙𝖙𝖊 𝕷𝖊́𝖌𝖎𝖔𝖓, 𝖏𝖊 𝖕𝖗𝖔𝖓𝖔𝖓𝖈𝖊 𝖑'𝖔𝖚𝖛𝖊𝖗𝖙𝖚𝖗𝖊 𝖉𝖊 𝖑𝖆 𝖕𝖚𝖗𝖌𝖊.

𝕼𝖚𝖊 𝖈𝖊𝖚𝖝 𝖖𝖚𝖎 𝖔𝖓𝖙 𝖔𝖚𝖇𝖑𝖎𝖊́ 𝖑𝖊𝖚𝖗 𝖘𝖊𝖗𝖒𝖊𝖓𝖙 𝖘𝖊 𝖘𝖔𝖚𝖛𝖎𝖊𝖓𝖓𝖊𝖓𝖙 𝖉𝖊 𝖓𝖔𝖙𝖗𝖊 𝖓𝖔𝖒.

「𝕷𝖆 𝕷𝖊́𝖌𝖎𝖔𝖓 𝖆𝖛𝖆𝖓𝖈𝖊. 𝕷𝖊 𝕾𝖆𝖘𝖆𝖐𝖎 𝖉𝖊́𝖈𝖎𝖉𝖊.」
━━━━━━━━━━━━━━━━━━━━
𝕾𝖔𝖚𝖛𝖊𝖗𝖆𝖎𝖓 : 𝕬𝖐𝖆𝖘𝖍𝖎 𝕾𝖆𝖘𝖆𝖐𝖎
━━━━━━━━━━━━━━━━━━━━`;

module.exports = {
    isOwner,

    async checkAdmin(sock, from, sender) {
        const groupMetadata = await sock.groupMetadata(from);
        const participant = groupMetadata.participants.find(p => p.id === sender);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    },

    async authOk(sock, from, sender) {
        return isOwner(sender) || await this.checkAdmin(sock, from, sender);
    },

    async tag(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) {
            return replyWithImage('🚫 Seuls les administrateurs peuvent utiliser cette commande.');
        }

        const customText = args.join(' ') || 'Attention tout le monde !';
        const groupMetadata = await sock.groupMetadata(from);
        const mentions = groupMetadata.participants.map(p => p.id);

        await replyWithImage(customText, { mentions });
    },

    async tagall(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) {
            return replyWithImage('🚫 Réservé aux administrateurs.');
        }

        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let messageText = `📢 *MENTION GLOBALE (${participants.length})*\n\n`;
        const mentions = [];

        for (let p of participants) {
            messageText += `@${p.id.split('@')[0]}\n`;
            mentions.push(p.id);
        }

        await replyWithImage(messageText, { mentions });
    },

    async add(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) {
            return replyWithImage('🚫 Réservé aux admins.');
        }

        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const targets = args.map(n => n.replace(/[^\d]/g, '') + '@s.whatsapp.net')
            .concat(mentioned, quoted ? [quoted] : []);

        if (targets.length === 0) {
            return replyWithImage("⚠️ Utilisation : .add <numéro> ou mentionnez / répondez à quelqu'un pour l'ajouter au groupe.");
        }

        try {
            await sock.groupParticipantsUpdate(from, targets, 'add');
            await replyWithImage(`✅ ${targets.length} membre(s) ajouté(s) au groupe.`);
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Impossible d\'ajouter ces membres (le numéro doit avoir accepté d\'être ajouté, ou le groupe est plein).');
        }
    },

    async kick(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) {
            return replyWithImage('🚫 Réservé aux admins.');
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        
        let targets = [];
        if (quoted) targets.push(quoted);
        if (mentioned && mentioned.length > 0) targets = targets.concat(mentioned);

        if (targets.length === 0) {
            return replyWithImage("⚠️ Mentionnez un membre ou répondez à son message pour l'expulser.");
        }

        await sock.groupParticipantsUpdate(from, targets, 'remove');
        await replyWithImage(`❌ ${targets.length} membre(s) retiré(s) du groupe.`);
    },

    async kickall(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) {
            return replyWithImage('🚫 Réservé aux admins.');
        }

        const groupMetadata = await sock.groupMetadata(from);
        const targets = groupMetadata.participants
            .filter(p => !p.admin && p.id !== sock.user.id.split(':')[0] + '@s.whatsapp.net')
            .map(p => p.id);

        if (targets.length === 0) {
            return replyWithImage('⚠️ Aucun membre non-admin à exclure.');
        }

        await sock.groupParticipantsUpdate(from, targets, 'remove');
        await replyWithImage(`🧹 Nettoyage terminé. ${targets.length} membres exclus.`);
    },

    async promote(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) return;

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const targets = quoted ? [quoted] : mentioned || [];

        if (targets.length === 0) return replyWithImage('⚠️ Indiquez quel membre promouvoir.');

        await sock.groupParticipantsUpdate(from, targets, 'promote');
        await replyWithImage('⭐ Membre(s) promu(s) administrateur(s).');
    },

    async demote(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) return;

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const targets = quoted ? [quoted] : mentioned || [];

        if (targets.length === 0) return replyWithImage('⚠️ Indiquez quel administrateur rétrograder.');

        await sock.groupParticipantsUpdate(from, targets, 'demote');
        await replyWithImage('🔻 Membre(s) rétrogradé(s).');
    },

    async resetGroup(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!await this.authOk(sock, from, sender)) return;

        try {
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.groupSettingUpdate(from, 'locked');
            await sock.groupRevokeInvite(from);

            await replyWithImage("🔄 *Paramètres du groupe réinitialisés* :\n- Envoi de messages : Autorisé à tous\n- Modification d'infos : Admins uniquement\n- Lien d'invitation : Révoqué et réinitialisé.");
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Échec de la réinitialisation du groupe.');
        }
    },

    async sasaki(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const videoPath = path.join(__dirname, '../assets/purge.mp4');
        if (fs.existsSync(videoPath)) {
            await sock.sendMessage(from, {
                video: fs.readFileSync(videoPath),
                caption: SASAKI_TEXT,
                mimetype: 'video/mp4'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: SASAKI_TEXT }, { quoted: msg });
        }
    },

    async purge(sock, msg, replyWithImage) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant;

        if (!isOwner(sender)) {
            return replyWithImage('🚫 Réservé au propriétaire du bot.');
        }

        await this.sasaki(sock, msg, replyWithImage);

        const groupMetadata = await sock.groupMetadata(from);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const targets = groupMetadata.participants
            .filter(p => !p.admin && p.id !== botId)
            .map(p => p.id);

        if (targets.length === 0) {
            return replyWithImage('⚠️ Aucun membre non-admin à purger.');
        }

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < targets.length; i++) {
            await sock.groupParticipantsUpdate(from, [targets[i]], 'remove');
            console.log(`🗡️ Purge : ${targets[i]} retiré (${i + 1}/${targets.length})`);
            if (i < targets.length - 1) await sleep(3000);
        }

        await replyWithImage(`⚔️ Purge terminée. ${targets.length} membre(s) éliminé(s).`);
    }
};
