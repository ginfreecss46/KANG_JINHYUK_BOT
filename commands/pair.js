const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PAIR_PATH = path.join(__dirname, '../temp/pairing.json');

function loadPairing() {
    try {
        if (fs.existsSync(PAIR_PATH)) {
            return JSON.parse(fs.readFileSync(PAIR_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('Erreur lecture pairing :', err);
    }
    return {};
}

function savePairing(data) {
    fs.mkdirSync(path.dirname(PAIR_PATH), { recursive: true });
    fs.writeFileSync(PAIR_PATH, JSON.stringify(data, null, 4));
}

function formatCode(code) {
    return code.match(/.{1,4}/g).join('-');
}

module.exports = {
    async pair(sock, msg, args, replyWithImage) {
        const from = msg.key.remoteJid;
        const phone = String(args[0] || '').replace(/[^\d]/g, '');

        if (!phone) {
            return replyWithImage('⚠️ Usage : .pair <numéro>. Ex : .pair 243812345678');
        }

        if (sock.user) {
            return replyWithImage('ℹ️ Le bot est déjà connecté. Envoyez .logout puis scannez le nouveau QR pour relier un autre numéro.');
        }

        try {
            const code = await sock.requestPairingCode(phone);
            const pairing = loadPairing();
            pairing[phone] = +Date.now();
            savePairing(pairing);

            const pretty = formatCode(code);
            await replyWithImage(`📲 *Code de jumelage (PAIRING)*\n\nNuméro : *${phone}*\nCode : *${pretty}*\n\nEnvoyez ce code à la personne pour qu'elle le saisisse sur WhatsApp > Appareils connectés > Connecter avec un code.`);
        } catch (err) {
            console.error(err);
            await replyWithImage('❌ Échec de la génération du code. Vérifiez que le numéro est valide et sur un compte WhatsApp.');
        }
    },

    async delpair(sock, msg, args, replyWithImage) {
        const phone = String(args[0] || '').replace(/[^\d]/g, '');

        if (!phone) {
            return replyWithImage('⚠️ Usage : .delpair <numéro>. Ex : .delpair 243812345678');
        }

        const pairing = loadPairing();
        if (pairing[phone]) {
            delete pairing[phone];
            savePairing(pairing);
            await replyWithImage(`🗑️ Pairing supprimé pour le numéro *${phone}*.`);
        } else {
            await replyWithImage(`ℹ️ Aucun pairing trouvé pour *${phone}*.`);
        }
    }
};