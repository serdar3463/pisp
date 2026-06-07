import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import db from "../db";

const router = Router();

// ── HTTP Basic Auth ──────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) { next(); return; } // No password configured → open

  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="PISP Admin"');
    res.status(401).send("Giriş gerekli");
    return;
  }
  const [, password] = Buffer.from(auth.slice(6), "base64").toString().split(":");
  if (password !== adminPassword) {
    res.setHeader("WWW-Authenticate", 'Basic realm="PISP Admin"');
    res.status(401).send("Yanlış şifre");
    return;
  }
  next();
}

router.use(requireAdmin);

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", (_req, res) => {
  const uniqueDevices = (db.prepare("SELECT COUNT(DISTINCT device_hash) as c FROM offer_acceptances").get() as { c: number }).c;
  const totalAcceptances = (db.prepare("SELECT COUNT(*) as c FROM offer_acceptances").get() as { c: number }).c;
  const pendingWithdrawals = (db.prepare("SELECT COUNT(*) as c FROM withdrawal_requests WHERE status IN ('pending','processing')").get() as { c: number }).c;
  const completedWithdrawals = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(estimated_try),0) as total FROM withdrawal_requests WHERE status='completed'").get() as { c: number; total: number });
  const payments = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(price_try),0) as total FROM user_payments WHERE status='completed'").get() as { c: number; total: number });

  res.json({
    uniqueDevices,
    totalAcceptances,
    pendingWithdrawals,
    completedWithdrawals: completedWithdrawals.c,
    totalWithdrawnTRY: completedWithdrawals.total,
    totalPayments: payments.c,
    totalRevenueTRY: payments.total,
  });
});

// ── Withdrawals ──────────────────────────────────────────────────────────────
router.get("/withdrawals", (_req, res) => {
  const rows = db.prepare(`
    SELECT id, device_hash, token_amount, estimated_try, status, iban, iban_holder, created_at, processed_at
    FROM withdrawal_requests ORDER BY created_at DESC LIMIT 200
  `).all();
  res.json({ withdrawals: rows });
});

router.patch("/withdrawals/:id", (req, res) => {
  const { status } = req.body as { status: string };
  if (!["completed", "rejected"].includes(status)) {
    res.status(400).json({ error: "Geçersiz durum" }); return;
  }
  db.prepare("UPDATE withdrawal_requests SET status=?, processed_at=? WHERE id=?")
    .run(status, new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

// ── User Payments ────────────────────────────────────────────────────────────
router.get("/payments", (_req, res) => {
  const rows = db.prepare(`
    SELECT id, device_hash, package_id, tokens, price_try, card_holder, status, created_at
    FROM user_payments ORDER BY created_at DESC LIMIT 200
  `).all();
  res.json({ payments: rows });
});

// ── Admin HTML Panel ─────────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PISP Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e2e8f0;min-height:100vh}
  .header{background:#13131f;border-bottom:1px solid #1e1e2e;padding:16px 24px;display:flex;align-items:center;gap:12px}
  .logo{font-size:22px;font-weight:800;color:#6366f1}
  .subtitle{color:#64748b;font-size:13px}
  .main{padding:24px;max-width:1200px;margin:0 auto}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
  .stat{background:#13131f;border:1px solid #1e1e2e;border-radius:12px;padding:16px}
  .stat-val{font-size:26px;font-weight:800;color:#6366f1;margin-bottom:4px}
  .stat-label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
  .stat-sub{font-size:12px;color:#10b981;margin-top:4px}
  h2{font-size:16px;font-weight:700;margin-bottom:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
  .section{margin-bottom:32px}
  .tabs{display:flex;gap:8px;margin-bottom:16px}
  .tab{background:#13131f;border:1px solid #1e1e2e;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;color:#94a3b8;transition:all .2s}
  .tab.active{background:#6366f1;border-color:#6366f1;color:#fff;font-weight:600}
  table{width:100%;border-collapse:collapse;background:#13131f;border-radius:12px;overflow:hidden;border:1px solid #1e1e2e}
  th{background:#0a0a0f;padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #1e1e2e}
  td{padding:10px 12px;font-size:13px;border-bottom:1px solid #1e1e2e;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#1a1a2e}
  .badge{display:inline-block;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .badge-pending{background:#78350f22;color:#fbbf24;border:1px solid #78350f44}
  .badge-processing{background:#1e3a5f22;color:#60a5fa;border:1px solid #1e3a5f44}
  .badge-completed{background:#14532d22;color:#4ade80;border:1px solid #14532d44}
  .badge-rejected{background:#450a0a22;color:#f87171;border:1px solid #450a0a44}
  .btn{border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .2s}
  .btn:hover{opacity:.8}
  .btn-green{background:#14532d;color:#4ade80}
  .btn-red{background:#450a0a;color:#f87171}
  .mono{font-family:'SF Mono',Monaco,monospace;font-size:11px;color:#94a3b8}
  .empty{text-align:center;padding:32px;color:#475569;font-size:14px}
  .refresh{float:right;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer;font-weight:600}
  .refresh:hover{background:#4f46e5}
  #toast{position:fixed;bottom:24px;right:24px;background:#10b981;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;opacity:0;transition:opacity .3s;pointer-events:none}
  .pane{display:none}
  .pane.active{display:block}
</style>
</head>
<body>
<div class="header">
  <span class="logo">💎 PISP Admin</span>
  <span class="subtitle">Uygulama Yönetim Paneli</span>
  <button class="refresh" onclick="loadAll()">⟳ Yenile</button>
</div>
<div class="main">
  <div class="stats" id="stats">
    <div class="stat"><div class="stat-val">—</div><div class="stat-label">Aktif Cihaz</div></div>
    <div class="stat"><div class="stat-val">—</div><div class="stat-label">Teklif Kabulü</div></div>
    <div class="stat"><div class="stat-val">—</div><div class="stat-label">Bekleyen Çekim</div></div>
    <div class="stat"><div class="stat-val">—</div><div class="stat-label">Token Satışı</div></div>
    <div class="stat"><div class="stat-val">—</div><div class="stat-label">Toplam Gelir</div></div>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('withdrawals')">💳 Çekim Talepleri</button>
    <button class="tab" onclick="showTab('payments')">💳 Token Satışları</button>
  </div>

  <div id="withdrawals" class="pane active">
    <h2>Çekim Talepleri</h2>
    <table>
      <thead><tr><th>Tarih</th><th>Ad Soyad</th><th>Token</th><th>Tahmini TL</th><th>IBAN</th><th>Durum</th><th>İşlem</th></tr></thead>
      <tbody id="wr-body"><tr><td colspan="7" class="empty">Yükleniyor...</td></tr></tbody>
    </table>
  </div>

  <div id="payments" class="pane">
    <h2>Token Satışları</h2>
    <table>
      <thead><tr><th>Tarih</th><th>Kart Sahibi</th><th>Paket</th><th>Token</th><th>Tutar</th><th>Durum</th></tr></thead>
      <tbody id="pay-body"><tr><td colspan="6" class="empty">Yükleniyor...</td></tr></tbody>
    </table>
  </div>
</div>
<div id="toast">Kaydedildi</div>

<script>
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', ['withdrawals','payments'][i] === name);
  });
  document.querySelectorAll('.pane').forEach(p => {
    p.classList.toggle('active', p.id === name);
  });
}

function badge(status) {
  const map = {pending:'badge-pending',processing:'badge-processing',completed:'badge-completed',rejected:'badge-rejected'};
  const label = {pending:'Bekliyor',processing:'İşlemde',completed:'Tamamlandı',rejected:'Reddedildi'};
  return \`<span class="badge \${map[status]||\''}">\${label[status]||status}</span>\`;
}

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
}

async function loadStats() {
  const r = await fetch('/admin/stats').then(x=>x.json()).catch(()=>({}));
  const el = document.getElementById('stats');
  el.innerHTML = \`
    <div class="stat"><div class="stat-val">\${r.uniqueDevices??0}</div><div class="stat-label">Aktif Cihaz</div></div>
    <div class="stat"><div class="stat-val">\${r.totalAcceptances??0}</div><div class="stat-label">Teklif Kabulü</div></div>
    <div class="stat"><div class="stat-val">\${r.pendingWithdrawals??0}</div><div class="stat-label">Bekleyen Çekim</div><div class="stat-sub">\${r.completedWithdrawals??0} tamamlandı</div></div>
    <div class="stat"><div class="stat-val">\${r.totalPayments??0}</div><div class="stat-label">Token Satışı</div></div>
    <div class="stat"><div class="stat-val">\${(r.totalRevenueTRY??0).toFixed(0)} ₺</div><div class="stat-label">Toplam Gelir</div><div class="stat-sub">\${(r.totalWithdrawnTRY??0).toFixed(0)} ₺ ödendi</div></div>
  \`;
}

async function loadWithdrawals() {
  const r = await fetch('/admin/withdrawals').then(x=>x.json()).catch(()=>({withdrawals:[]}));
  const rows = r.withdrawals ?? [];
  const tbody = document.getElementById('wr-body');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" class="empty">Henüz çekim talebi yok</td></tr>';return;}
  tbody.innerHTML = rows.map(w => \`
    <tr>
      <td>\${fmt(w.created_at)}</td>
      <td>\${w.iban_holder||'—'}</td>
      <td><strong>\${w.token_amount} 💎</strong></td>
      <td>\${(w.estimated_try||0).toFixed(2)} ₺</td>
      <td class="mono">\${w.iban||(w.status==='pending'?'<span style="color:#fbbf24">IBAN bekleniyor</span>':'—')}</td>
      <td>\${badge(w.status)}</td>
      <td>
        \${['pending','processing'].includes(w.status) ? \`
          <button class="btn btn-green" onclick="updateWithdrawal('\${w.id}','completed')">Ödendi</button>
          <button class="btn btn-red" style="margin-left:4px" onclick="updateWithdrawal('\${w.id}','rejected')">Reddet</button>
        \` : '—'}
      </td>
    </tr>
  \`).join('');
}

async function loadPayments() {
  const r = await fetch('/admin/payments').then(x=>x.json()).catch(()=>({payments:[]}));
  const rows = r.payments ?? [];
  const tbody = document.getElementById('pay-body');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="6" class="empty">Henüz token satışı yok</td></tr>';return;}
  const pkgLabel = {pkg_100:'Başlangıç 100',pkg_300:'Popüler 300',pkg_500:'Avantajlı 500',pkg_1000:'Süper 1000'};
  tbody.innerHTML = rows.map(p => \`
    <tr>
      <td>\${fmt(p.created_at)}</td>
      <td>\${p.card_holder||'—'}</td>
      <td>\${pkgLabel[p.package_id]||p.package_id}</td>
      <td><strong>\${p.tokens} 💎</strong></td>
      <td>\${(p.price_try||0).toFixed(2)} ₺</td>
      <td>\${badge(p.status)}</td>
    </tr>
  \`).join('');
}

async function updateWithdrawal(id, status) {
  const label = status==='completed' ? 'Ödendi olarak işaretlensin mi?' : 'Reddedilsin mi?';
  if(!confirm(label)) return;
  await fetch(\`/admin/withdrawals/\${id}\`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  showToast(status==='completed' ? '✓ Ödendi olarak işaretlendi' : '✗ Reddedildi');
  loadWithdrawals();
  loadStats();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2500);
}

async function loadAll() { await Promise.all([loadStats(), loadWithdrawals(), loadPayments()]); }
loadAll();
setInterval(loadAll, 30000);
</script>
</body>
</html>`);
});

export default router;
