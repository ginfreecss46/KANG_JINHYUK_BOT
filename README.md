# 𝆺𝅥⃝🍷 KANG JINHYUK WHATSAPP BOT 𝆺𝅥⃝⚡

Bot WhatsApp complet basé sur `@whiskeysockets/baileys` inspiré de Void Stiles / Nogitsune (KANG JINHYUK).

## 🚀 Lancement en Local

1. Installez **Node.js** (v18 ou v20 recommandée) et **ffmpeg** sur votre machine.
2. Clonez ce dépôt et ouvrez un terminal dans le dossier.
3. Créez un fichier `.env` avec vos propriétaires :
   ```env
   PORT=3000
   OWNERS=242067274660,242069953932
   ```
4. Placez vos fichiers médias dans le dossier `assets/` :
   - `assets/void_stiles.jpg` (image par défaut des réponses)
   - `assets/menu.mp4` (vidéo du menu)
   - `assets/purge.mp4` (vidéo de la purge)
5. Installez les dépendances :
   ```bash
   npm install
   ```
6. Lancez le bot :
   ```bash
   npm start
   ```
7. Scannez le QR Code qui s'affiche dans votre terminal avec WhatsApp (Appareils connectés).

> Le mode Watch est intégré : toute modification du code ou de `.env` redémarre automatiquement le bot (même quand il est déjà connecté).

---

## 📌 Commandes Disponibles

### 🎬 Média
- `.tgs` : Convertit un fichier `.tgs` Telegram en sticker WebP WhatsApp.
- `.play <recherche>` : Recherche et télécharge une musique YouTube.
- `.take` : Renomme un sticker avec le nom WhatsApp de l'utilisateur.
- `.add` : Convertit une image en sticker avec le nom WhatsApp de l'utilisateur.

### 👁️ Statuts
- `.save` : Enregistre le statut auquel vous répondez dans `saved_statuses/`.
- Auto-view des statuts activé par défaut.

### 👥 Administration (admin de groupe ou owner)
- `.tag <texte>` : Mentionne tous les membres du groupe avec un message personnalisé.
- `.tagall` : Liste et mentionne tous les membres.
- `.kick @membre` : Exclut un membre du groupe.
- `.kickall` : Exclut tous les membres non-admins.
- `.promote @membre` : Promut un membre administrateur.
- `.demote @membre` : Rétrograde un administrateur.
- `.reset` : Réinitialise les paramètres du groupe.
- `.purge` : 🔥 *Owner uniquement* — Envoie la vidéo de purge puis exclut les membres un à un toutes les 3 secondes.

### 🛡️ Système / Modes
- `.ping` : Teste le bot (temps de réponse).
- `.private` : Mode privé — seul le propriétaire peut utiliser les commandes.
- `.public` : Mode public — tout le monde peut utiliser les commandes.
- `.pair <numéro>` : *Owner uniquement* — Génère un code de jumelage (pairing) pour connecter un numéro.
- `.delpair <numéro>` : *Owner uniquement* — Supprime la session de jumelage du numéro.

---

## ⚙️ Configuration Owners

Les numéros propriétaires sont définis dans `.env` (`OWNERS=`). Les owners ont accès à toutes les commandes, y compris `.purge`, `.pair` et `.delpair`.

---

## ☁️ Déploiement

### 🟢 Sur Render (Recommandé pour les Bots WebSockets / Long-running)
> **Note :** Render conserve un serveur en ligne 24/7 (contrairement à Vercel qui est serverless).

1. Poussez ce code sur GitHub.
2. Rendez-vous sur [Render.com](https://render.com) -> **New +** -> **Web Service**.
3. Connectez votre dépôt GitHub.
4. Paramètres :
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Ajoutez la variable d'environnement `OWNERS` dans Render.
6. Déployez ! Consultez les logs Render pour scanner le QR Code lors du premier démarrage.

### ⚠️ Concernant Vercel
Vercel est une plateforme **Serverless** (les fonctions s'arrêtent après chaque requête). Les bots WhatsApp nécessitent une connexion WebSocket persistante en arrière-plan. Il est donc fortement recommandé d'utiliser **Render**, **Koyeb**, **Railway** ou un **VPS** pour faire tourner ce bot.