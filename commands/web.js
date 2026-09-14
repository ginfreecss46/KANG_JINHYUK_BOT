const QRCode = require('qrcode');

const state = { sock: null, qr: null, connected: false };

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KANG JINHYUK · Connexion</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#0a0a0f; color:#e8e8f0;
    font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
    background-image:radial-gradient(circle at 20% 20%,#1a1026 0%,transparent 50%),
                     radial-gradient(circle at 80% 80%,#14081f 0%,transparent 50%);
  }
  .card {
    background:#12121c; border:1px solid #29293f; border-radius:16px;
    padding:32px; width:100%; max-width:420px; box-shadow:0 0 60px rgba(120,0,255,.15);
  }
  h1 { text-align:center; font-size:18px; letter-spacing:3px; color:#c9a7ff; margin-bottom:4px; }
  .sub { text-align:center; color:#6c6c80; font-size:12px; margin-bottom:24px; letter-spacing:1px; }
  label { display:block; font-size:12px; color:#9a9ab0; margin-bottom:6px; letter-spacing:1px; }
  input {
    width:100%; padding:12px 14px; border-radius:10px; border:1px solid #2a2a42;
    background:#0d0d16; color:#fff; font-size:15px; outline:none; margin-bottom:8px;
  }
  input:focus { border-color:#8b5cf6; }
  .btns { display:flex; gap:8px; margin-top:12px; }
  button {
    flex:1; padding:12px; border:none; border-radius:10px; cursor:pointer;
    font-size:13px; font-weight:600; color:#fff; transition:transform .1s, filter .1s;
  }
  button:hover { filter:brightness(1.15); transform:translateY(-1px); }
  .pair { background:linear-gradient(135deg,#7c3aed,#a855f7); }
  .qr { background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155 !important; }
  #result {
    margin-top:16px; padding:14px; border-radius:10px; background:#0b0b14;
    border:1px solid #23233c; display:none; word-break:break-word; text-align:center;
  }
  #qrBox { margin-top:16px; display:none; text-align:center; }
  #qrBox img { width:220px; height:220px; border-radius:10px; background:#fff; padding:8px; }
  .ok { color:#6ee7b7; } .err { color:#f87171; }
  .st { text-align:center; font-size:12px; margin-top:4px; }
  .st.on { color:#34d399; } .st.off { color:#fbbf24; }
</style>
</head>
<body>
  <div class="card">
    <h1>KANG JINHYUK</h1>
    <div class="sub">SYSTEM CONNECTION</div>
    <div id="status" class="st">● Vérification du statut…</div>

    <label>NUMÉRO WHATSAPP (format international)</label>
    <input id="phone" type="tel" placeholder="Ex : 242067274660" inputmode="numeric">

    <div class="btns">
      <button class="pair" onclick="pair()">📲 CODE DE JUMELAGE</button>
      <button class="qr" onclick="showQr()">▣ QR CODE</button>
    </div>

    <div id="qrBox"><img id="qrImg" alt="QR"><div class="st off">Scannez ce QR avec WhatsApp &gt; Appareils connectés</div></div>
    <div id="result"></div>
  </div>

<script>
async function getStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    const el = document.getElementById('status');
    el.className = 'st ' + (d.connected ? 'on' : 'off');
    el.textContent = d.connected ? '● CONNECTÉ — système opérationnel' : '● EN ATTENTE DE CONNEXION';
  } catch(e) { document.getElementById('status').textContent = '⚠ Impossible de joindre le serveur'; }
}
async function pair() {
  const phone = document.getElementById('phone').value.replace(/[^0-9]/g,'');
  hide();
  if (!phone) return show('⚠ Entrez un numéro valide (avec indicatif pays).', false);
  const btn = event.target; btn.disabled = true;
  try {
    const r = await fetch('/api/pair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
    const d = await r.json();
    if (d.ok) {
      show('<b>Code de jumelage :</b><br><br><span style="font-size:26px;font-weight:700;color:#c9a7ff;letter-spacing:4px">' + d.code + '</span><br><br>À saisir sur WhatsApp > Appareils connectés > Connecter un appareil > Connecter avec un numéro.', true);
    } else show(d.error, false);
  } catch(e) { show('❌ Erreur serveur', false); }
  btn.disabled = false;
}
async function showQr() {
  hide();
  try {
    const r = await fetch('/api/qr');
    const d = await r.json();
    if (d.qr) {
      document.getElementById('qrImg').src = d.qr;
      document.getElementById('qrBox').style.display = 'block';
    } else {
      show(d.error, false);
    }
  } catch(e) { show('❌ Erreur serveur', false); }
}
function show(msg, ok) {
  const el = document.getElementById('result');
  el.innerHTML = msg; el.style.display = 'block';
  el.className = (ok ? 'ok':'err'); el.style.display='block';
}
function hide() { document.getElementById('result').style.display='none'; document.getElementById('qrBox').style.display='none'; }
getStatus();
setInterval(getStatus, 5000);
</script>
</body>
</html>`;

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

async function handle(req, res) {
    const url = req.url.split('?')[0];

    if (req.method === 'GET' && url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML);
        return;
    }

    if (req.method === 'GET' && url === '/api/status') {
        json(res, 200, { connected: !!state.connected });
        return;
    }

    if (req.method === 'GET' && url === '/api/qr') {
        if (state.connected) {
            json(res, 200, { qr: null, error: '✅ Bot déjà connecté. Utilisez le code de jumelage ou déconnectez un appareil pour obtenir un QR.' });
            return;
        }
        if (!state.qr) {
            json(res, 200, { qr: null, error: 'Aucun QR pour le moment. Le bot génère un QR au démarrage — attendez quelques secondes puis réessayez.' });
            return;
        }
        try {
            const dataUrl = await QRCode.toDataURL(state.qr, { width: 300, margin: 2 });
            json(res, 200, { qr: dataUrl });
        } catch (err) {
            json(res, 500, { qr: null, error: 'Erreur de génération du QR.' });
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
                if (!state.sock) return json(res, 400, { ok: false, error: 'Le bot n\'est pas encore prêt. Réessayez dans quelques secondes.' });
                const rawCode = await state.sock.requestPairingCode(cleanPhone);
                const code = rawCode.match(/.{1,4}/g).join('-');
                json(res, 200, { ok: true, code });
            } catch (err) {
                console.error('Erreur pairing :', err);
                json(res, 500, { ok: false, error: 'Impossible de générer le code. Vérifiez le numéro (indicatif pays requis).' });
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