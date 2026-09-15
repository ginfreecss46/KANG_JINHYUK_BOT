const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const state = { sock: null, qr: null, connected: false };

// Sessions de liaison temporaires (nouvel appareil à connecter)
const linkSessions = new Map();

async function spawnLinkSocket() {
    return new Promise(async (resolve, reject) => {
        try {
            const id = crypto.randomBytes(6).toString('hex');
            const authDir = path.join(__dirname, '../temp/link_' + id);
            const { state } = await useMultiFileAuthState(authDir);
            const sock = makeWASocket({
                logger: pino({ level: 'silent' }),
                auth: state,
                browser: ['KANG JINHYUK', 'Chrome', '1.0']
            });
            linkSessions.set(id, { sock, authDir, createdAt: Date.now() });

            const timeout = setTimeout(() => cleanupLink(id), 120000);

            sock.ev.on('connection.update', (u) => {
                if (u.qr) {
                    clearTimeout(timeout);
                    resolve(u.qr);
                }
                if (u.connection === 'open') {
                    console.log(`🔗 Nouvel appareil lié (session ${id})`);
                    clearTimeout(timeout);
                }
                if (u.connection === 'close') {
                    clearTimeout(timeout);
                    cleanupLink(id);
                }
            });
            sock.ev.on('creds.update', () => {});
        } catch (err) {
            reject(err);
        }
    });
}

function cleanupLink(id) {
    const entry = linkSessions.get(id);
    if (!entry) return;
    try { entry.sock?.end(undefined); } catch (e) {}
    try { fs.rmSync(entry.authDir, { recursive: true, force: true }); } catch (e) {}
    linkSessions.delete(id);
    console.log(`🧹 Session de liaison nettoyée (${id})`);
}

const ICONS = `<link rel="stylesheet" href="https://unpkg.com/lucide-static@0.468.0/font/lucide.min.css">`;

const COMMON = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#06060c;--bg2:#0c0c18;--card:#10101e;--border:#1e1e3a;--border-h:#3a2a6e;
--purple:#8b5cf6;--purple-l:#a78bfa;--purple-d:#6d28d9;--green:#22c55e;--red:#ef4444;
--yellow:#eab308;--text:#e2e2f0;--text2:#8888a8;--text3:#55556e;--glow:rgba(139,92,246,.12)}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,-apple-system,sans-serif;
min-height:100vh;overflow-x:hidden;line-height:1.6}
body::before{content:'';position:fixed;top:-40%;left:-20%;width:80vw;height:80vw;
background:radial-gradient(circle,rgba(100,40,220,.06) 0%,transparent 60%);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;bottom:-30%;right:-15%;width:60vw;height:60vw;
background:radial-gradient(circle,rgba(59,130,246,.04) 0%,transparent 60%);pointer-events:none;z-index:0}
a{text-decoration:none;color:inherit}
</style>`;

const LANDING = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KANG JINHYUK — System</title>${ICONS}${COMMON}
<style>
.hero{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;
align-items:center;justify-content:center;text-align:center;padding:40px 24px}
.hero::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
width:1px;height:120px;background:linear-gradient(transparent,var(--border),transparent)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;
border:1px solid var(--border);background:rgba(139,92,246,.06);font-size:11px;letter-spacing:2px;
color:var(--purple-l);text-transform:uppercase;margin-bottom:28px;font-weight:600}
.badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green);
animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:clamp(32px,7vw,64px);font-weight:900;letter-spacing:-2px;
background:linear-gradient(135deg,#fff 0%,var(--purple-l) 50%,#7c3aed 100%);
-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1}
.tagline{font-size:clamp(14px,2vw,18px);color:var(--text2);margin-top:12px;font-weight:300;letter-spacing:.5px}
.sep{width:60px;height:2px;background:linear-gradient(90deg,transparent,var(--purple),transparent);
margin:28px auto;border-radius:2px}
.desc{max-width:520px;color:var(--text3);font-size:14px;line-height:1.8}
.cta{margin-top:32px;display:inline-flex;align-items:center;gap:10px;padding:14px 32px;
border-radius:12px;background:linear-gradient(135deg,var(--purple-d),var(--purple));
color:#fff;font-weight:600;font-size:14px;letter-spacing:.5px;border:none;cursor:pointer;
transition:transform .15s,box-shadow .2s}
.cta:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(139,92,246,.35)}
.cta i{width:18px;height:18px}

.features{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:80px 24px 60px}
.features h2{text-align:center;font-size:24px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px}
.features .sub{text-align:center;color:var(--text3);font-size:13px;letter-spacing:1px;
text-transform:uppercase;margin-bottom:48px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;
transition:border-color .2s,transform .2s;position:relative;overflow:hidden}
.card:hover{border-color:var(--border-h);transform:translateY(-3px)}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
background:linear-gradient(90deg,transparent,rgba(139,92,246,.3),transparent)}
.card-icon{width:40px;height:40px;border-radius:10px;background:rgba(139,92,246,.1);
display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:var(--purple-l)}
.card-icon i{width:20px;height:20px}
.card h3{font-size:15px;font-weight:700;margin-bottom:6px;letter-spacing:-.2px}
.card p{color:var(--text2);font-size:13px;line-height:1.7}

.commands{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:40px 24px 60px}
.commands h2{text-align:center;font-size:24px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px}
.commands .sub{text-align:center;color:var(--text3);font-size:13px;letter-spacing:1px;
text-transform:uppercase;margin-bottom:48px}
.cmd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.cmd{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;
display:flex;align-items:center;gap:12px;transition:border-color .2s}
.cmd:hover{border-color:var(--border-h)}
.cmd i{width:18px;height:18px;color:var(--purple-l);flex-shrink:0}
.cmd span{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#fff}
.cmd small{display:block;font-size:11px;color:var(--text3);font-family:'Inter',sans-serif;font-weight:400;margin-top:2px}
.owner{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:40px 24px 80px;text-align:center}
.owner-card{display:inline-flex;flex-direction:column;align-items:center;gap:10px;
padding:20px 40px;border-radius:14px;border:1px solid var(--border);background:var(--card)}
.owner-card .name{font-size:16px;font-weight:700;letter-spacing:1px;color:var(--purple-l)}
.owner-card .role{font-size:11px;color:var(--text3);letter-spacing:2px;text-transform:uppercase}
.footer{text-align:center;color:var(--text3);font-size:11px;padding:24px;
border-top:1px solid var(--border);letter-spacing:1px;position:relative;z-index:1}
</style></head>
<body>
<section class="hero">
  <div class="badge"><span></span>Système opérationnel</div>
  <h1>KANG JINHYUK</h1>
  <p class="tagline">Bot WhatsApp · Sovereign System</p>
  <div class="sep"></div>
  <p class="desc">
    Un système conçu pour régner. Commandes de groupe, média, conversion de stickers, gestion de statuts — le tout porté par une architecture pensée pour la puissance et le contrôle total.
  </p>
  <a href="/connect" class="cta"><i data-lucide="zap"></i> Accéder au système</a>
</section>

<section class="features">
  <h2>Fonctionnalités</h2>
  <p class="sub">Ce que le système peut faire</p>
  <div class="grid">
    <div class="card">
      <div class="card-icon"><i data-lucide="shield-check"></i></div>
      <h3>Contrôle total</h3>
      <p>Système de propriétaire avec modes privé et public. Seuls les owners ont accès à toutes les commandes critiques.</p>
    </div>
    <div class="card">
      <div class="card-icon"><i data-lucide="image"></i></div>
      <h3>Conversion & Stickers</h3>
      <p>Convertit les stickers Telegram (.tgs) en WebP. Crée des stickers à partir d'images avec le nom de l'utilisateur.</p>
    </div>
    <div class="card">
      <div class="card-icon"><i data-lucide="music"></i></div>
      <h3>Musique YouTube</h3>
      <p>Recherche et télécharge n'importe quelle musique YouTube en audio avec une simple commande.</p>
    </div>
    <div class="card">
      <div class="card-icon"><i data-lucide="users"></i></div>
      <h3>Administration de groupe</h3>
      <p>Promotion, rétrogradation, exclusion, mention globale — tout le contrôle d'un groupe entre vos mains.</p>
    </div>
    <div class="card">
      <div class="card-icon"><i data-lucide="scan-eye"></i></div>
      <h3>Auto-View des statuts</h3>
      <p>Le bot visualise automatiquement tous les statuts et peut sauvegarder ceux que vous souhaitez garder.</p>
    </div>
    <div class="card">
      <div class="card-icon"><i data-lucide="swords"></i></div>
      <h3>Purge</h3>
      <p>L'arme ultime du Souverain. Message de déclaration puis exclusion un à un avec décompte de 3 secondes.</p>
    </div>
  </div>
</section>

<section class="commands">
  <h2>Commandes</h2>
  <p class="sub">Toutes les commandes disponibles</p>
  <div class="cmd-grid">
    <div class="cmd"><i data-lucide="monitor"></i><div><span>.ping</span><small>Test du système</small></div></div>
    <div class="cmd"><i data-lucide="layers"></i><div><span>.tgs</span><small>TGS → WebP</small></div></div>
    <div class="cmd"><i data-lucide="play"></i><div><span>.play</span><small>YouTube → Audio</small></div></div>
    <div class="cmd"><i data-lucide="tag"></i><div><span>.take</span><small>Renommer sticker</small></div></div>
    <div class="cmd"><i data-lucide="plus-square"></i><div><span>.s</span><small>Image → Sticker</small></div></div>
    <div class="cmd"><i data-lucide="bookmark"></i><div><span>.save</span><small>Sauvegarder statut</small></div></div>
    <div class="cmd"><i data-lucide="at-sign"></i><div><span>.tag</span><small>Mentionner tous</small></div></div>
    <div class="cmd"><i data-lucide="list"></i><div><span>.tagall</span><small>Liste + mentions</small></div></div>
    <div class="cmd"><i data-lucide="user-minus"></i><div><span>.kick</span><small>Exclure un membre</small></div></div>
    <div class="cmd"><i data-lucide="user-x"></i><div><span>.kickall</span><small>Exclure les non-admins</small></div></div>
    <div class="cmd"><i data-lucide="user-plus"></i><div><span>.add</span><small>Ajouter des membres</small></div></div>
    <div class="cmd"><i data-lucide="swords"></i><div><span>.purge</span><small>Purge complète</small></div></div>
    <div class="cmd"><i data-lucide="arrow-up"></i><div><span>.promote</span><small>Promouvoir admin</small></div></div>
    <div class="cmd"><i data-lucide="arrow-down"></i><div><span>.demote</span><small>Rétrograder</small></div></div>
    <div class="cmd"><i data-lucide="refresh-cw"></i><div><span>.reset</span><small>Réinitialiser groupe</small></div></div>
    <div class="cmd"><i data-lucide="lock"></i><div><span>.private</span><small>Mode owner</small></div></div>
    <div class="cmd"><i data-lucide="globe"></i><div><span>.public</span><small>Mode ouvert</small></div></div>
    <div class="cmd"><i data-lucide="link"></i><div><span>.pair</span><small>Jumeler un numéro</small></div></div>
    <div class="cmd"><i data-lucide="unlink"></i><div><span>.delpair</span><small>Supprimer jumelage</small></div></div>
    <div class="cmd"><i data-lucide="log-out"></i><div><span>.logout</span><small>Réinitialiser la session</small></div></div>
  </div>
</section>

<section class="owner">
  <div class="owner-card">
    <div class="role">Souverain & Créateur</div>
    <div class="name">AKASHI SASAKI</div>
    <div class="role">void_stiles sasaki</div>
  </div>
</section>

<footer class="footer">
  KANG JINHYUK BOT — Conçu par AKASHI SASAKI
</footer>
<script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
</body></html>`;

const CONNECT = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KANG JINHYUK — Connexion</title>${ICONS}${COMMON}
<style>
.wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;
justify-content:center;padding:24px;position:relative;z-index:1}
.nav{position:fixed;top:0;left:0;right:0;padding:14px 24px;display:flex;align-items:center;
gap:10px;z-index:10;border-bottom:1px solid var(--border);background:rgba(6,6,12,.8);
backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav a{font-size:13px;color:var(--text2);font-weight:500;display:flex;align-items:center;gap:6px;
transition:color .15s}
.nav a:hover{color:var(--purple-l)}
.nav a i{width:16px;height:16px}
.nav .title{margin-left:auto;font-size:12px;letter-spacing:2px;color:var(--text3);
font-family:'JetBrains Mono',monospace}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;
padding:32px;width:100%;max-width:420px;box-shadow:0 0 80px rgba(139,92,246,.08)}
h1{font-size:18px;font-weight:800;letter-spacing:2px;text-align:center;margin-bottom:2px}
.sub{text-align:center;color:var(--text3);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px}
.status{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;
margin-bottom:20px;padding:8px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.2)}
.status .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.status.on .dot{background:var(--green);box-shadow:0 0 8px rgba(34,197,94,.5)}
.status.off .dot{background:var(--yellow);box-shadow:0 0 8px rgba(234,179,8,.4)}
.status.on{color:var(--green)} .status.off{color:var(--yellow)}
label{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3);
margin-bottom:6px;letter-spacing:1px;text-transform:uppercase;font-weight:600}
label i{width:14px;height:14px;color:var(--purple-l)}
input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);
background:rgba(0,0,0,.3);color:#fff;font-size:15px;font-family:'JetBrains Mono',monospace;
outline:none;letter-spacing:1px}
input:focus{border-color:var(--purple)}
input::placeholder{color:var(--text3);font-family:'Inter',sans-serif;letter-spacing:0}
.btns{display:flex;gap:8px;margin-top:16px}
button{flex:1;padding:13px;border:none;border-radius:10px;cursor:pointer;font-size:13px;
font-weight:600;color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;
transition:transform .12s,filter .15s;letter-spacing:.3px}
button:hover{filter:brightness(1.15);transform:translateY(-1px)}
button:active{transform:scale(.98)}
button i{width:16px;height:16px}
.pair-btn{background:linear-gradient(135deg,var(--purple-d),var(--purple))}
.qr-btn{background:rgba(255,255,255,.06);border:1px solid var(--border) !important}
#result{margin-top:14px;padding:14px;border-radius:10px;background:rgba(0,0,0,.25);
border:1px solid var(--border);display:none;word-break:break-word;text-align:center;font-size:13px;line-height:1.7}
#qrBox{margin-top:16px;display:none;text-align:center}
#qrBox img{width:220px;height:220px;border-radius:12px;background:#fff;padding:10px}
.ok{color:var(--green)} .err{color:var(--red)}
.back{position:fixed;bottom:20px;font-size:11px;color:var(--text3);letter-spacing:1px;
text-decoration:none;transition:color .15s;z-index:10}
.back:hover{color:var(--purple-l)}
</style></head>
<body>
<nav class="nav">
  <a href="/"><i data-lucide="arrow-left"></i> Retour</a>
  <div class="title">KANG JINHYUK</div>
</nav>

<div class="wrap">
  <div class="card">
    <h1>CONNEXION</h1>
    <div class="sub">Système de jumelage</div>
    <div id="status" class="status off"><span class="dot"></span> <span id="statusText">Vérification…</span></div>

    <label><i data-lucide="phone"></i> Numéro WhatsApp</label>
    <input id="phone" type="tel" placeholder="242067274660" inputmode="numeric">
    <div class="btns">
      <button class="pair-btn" onclick="pair()"><i data-lucide="link"></i> Code de jumelage</button>
      <button class="qr-btn" onclick="showQr()"><i data-lucide="scan"></i> QR Code</button>
    </div>
    <div id="qrBox"><img id="qrImg" alt="QR Code"><div style="font-size:11px;color:var(--text3);margin-top:8px">Scannez avec WhatsApp &gt; Appareils connectés</div></div>
    <div id="result"></div>
  </div>
</div>
<a href="/" class="back">← Retour à la présentation</a>
<script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"></script>
<script>
lucide.createIcons();
async function getStatus(){
  try{const r=await fetch('/api/status');const d=await r.json();
  const s=document.getElementById('status');const t=document.getElementById('statusText');
  s.className='status '+(d.connected?'on':'off');
  t.textContent=d.connected?'Connecté — système opérationnel':'En attente de connexion';
  }catch(e){document.getElementById('statusText').textContent='Impossible de joindre le serveur';}
}
async function pair(){
  const phone=document.getElementById('phone').value.replace(/[^0-9]/g,'');
  hide();
  if(!phone)return show('Veuillez entrer un numéro valide avec indicatif pays.',false);
  const btn=event.target;btn.disabled=true;
  try{const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
  const d=await r.json();
  if(d.ok)show('<b>Code de jumelage :</b><br><br><span style="font-size:28px;font-weight:800;color:var(--purple-l);letter-spacing:5px;font-family:JetBrains Mono,monospace">'+d.code+'</span><br><br><span style="color:var(--text3);font-size:12px">Saisissez ce code sur WhatsApp<br>Appareils connectés → Connecter un appareil</span>',true);
  else show(d.error,false);}catch(e){show('Erreur serveur',false);}
  btn.disabled=false;
}
async function showQr(){
  hide();try{const r=await fetch('/api/qr');const d=await r.json();
  if(d.qr){document.getElementById('qrImg').src=d.qr;document.getElementById('qrBox').style.display='block';}
  else show(d.error,false);}catch(e){show('Erreur serveur',false);}
}
function show(msg,ok){const el=document.getElementById('result');el.innerHTML=msg;
el.className=(ok?'ok':'err');el.style.display='block';}
function hide(){document.getElementById('result').style.display='none';document.getElementById('qrBox').style.display='none';}
getStatus();setInterval(getStatus,5000);
</script></body></html>`;

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

async function handle(req, res) {
    const url = req.url.split('?')[0];

    if (req.method === 'GET' && url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(LANDING);
        return;
    }

    if (req.method === 'GET' && url === '/connect') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(CONNECT);
        return;
    }

    if (req.method === 'GET' && url === '/api/status') {
        json(res, 200, { connected: !!state.connected });
        return;
    }

    if (req.method === 'GET' && url === '/api/qr') {
        if (state.connected) {
            json(res, 200, { qr: null, error: 'Le bot est déjà connecté. Pour relier un autre numéro, envoyez .logout au bot puis relancez cette page.' });
            return;
        }
        try {
            const qr = await spawnLinkSocket();
            const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            json(res, 200, { qr: dataUrl });
        } catch (err) {
            console.error('Erreur QR :', err);
            json(res, 500, { qr: null, error: 'Impossible de générer le QR. Réessayez dans quelques secondes.' });
        }
        return;
    }

    if (req.method === 'POST' && url === '/api/pair') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { phone } = JSON.parse(body || '{}');
                const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
                if (!cleanPhone) return json(res, 400, { ok: false, error: 'Numéro invalide.' });
                if (state.connected) return json(res, 400, { ok: false, error: 'Le bot est déjà connecté. Envoyez .logout au bot pour déconnecter avant de jumeler un autre numéro.' });
                if (!state.sock) return json(res, 400, { ok: false, error: 'Le bot n\'est pas encore prêt. Réessayez dans quelques secondes.' });
                const rawCode = await state.sock.requestPairingCode(cleanPhone);
                const code = rawCode.match(/.{1,4}/g).join('-');
                json(res, 200, { ok: true, code });
            } catch (err) {
                console.error('Erreur pairing :', err);
                const friendly = err.isBoom && err.output?.statusCode === 428
                    ? 'Le bot est déjà connecté (session active). Envoyez .logout pour jumeler un nouveau numéro.'
                    : 'Impossible de générer le code. Vérifiez le numéro (indicatif pays requis).';
                json(res, 500, { ok: false, error: friendly });
            }
        });
        return;
    }

    json(res, 404, { ok: false, error: 'Not Found' });
}

module.exports = {
    state,
    setSocket(sock) { state.sock = sock; },
    setQr(qr) { state.qr = qr; },
    setConnected(v) { state.connected = v; },
    handle
};