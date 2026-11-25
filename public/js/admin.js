const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tgl = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };
const stClass = { "Menunggu Verifikasi": "st-wait", "Terverifikasi": "st-verify", "Diterima": "st-ok", "Ditolak": "st-no" };
let token = sessionStorage.getItem("spmbToken") || "";
let DATA = [];
let JUR = [];
let STATUS = ["Menunggu Verifikasi", "Terverifikasi", "Diterima", "Ditolak"];

async function api(url, opt = {}) {
  const r = await fetch(url, {
    ...opt,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(opt.headers || {}) }
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { keluar(false); throw new Error(j.pesan || "Sesi habis, login ulang"); }
  if (!r.ok || j.ok === false) throw new Error(j.pesan || "Terjadi kesalahan");
  return j;
}

function tampilDash() {
  $("#loginView").hidden = true;
  $("#dashView").hidden = false;
  muatData();
}

function keluar(pesan = true) {
  token = "";
  sessionStorage.removeItem("spmbToken");
  $("#dashView").hidden = true;
  $("#loginView").hidden = false;
  if (pesan) toast("Sudah keluar dari panel admin");
}

$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("#adminPass").value })
    });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.pesan || "Login gagal");
    token = j.token;
    sessionStorage.setItem("spmbToken", token);
    $("#adminPass").value = "";
    tampilDash();
    toast("Selamat datang, admin 👋");
  } catch (err) {
    toast(err.message, "err");
  }
});

async function muatData() {
  try {
    const j = await api("/api/admin/pendaftar");
    DATA = j.data;
    JUR = j.jurusan;
    STATUS = j.statusList;
    const fj = $("#fJurusan");
    if (fj.options.length <= 1) JUR.forEach(x => fj.add(new Option(x.kode + " — " + x.nama, x.kode)));
    render();
  } catch (err) {
    toast(err.message, "err");
  }
}

function render() {
  const q = $("#q").value.toLowerCase();
  const fs = $("#fStatus").value;
  const fj = $("#fJurusan").value;
  const rows = DATA.filter(p =>
    (!fs || p.status === fs) &&
    (!fj || p.jurusan1 === fj || p.jurusan2 === fj) &&
    (!q || [p.nama, p.nomor, p.nisn, p.asalSekolah].join(" ").toLowerCase().includes(q))
  );
  $("#adminStats").innerHTML = [["Total", DATA.length], ...STATUS.map(s => [s, DATA.filter(p => p.status === s).length])]
    .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${esc(k)}</span></div>`).join("");
  $("#tbody").innerHTML = rows.length ? rows.map(p => `
    <tr data-id="${p.id}">
      <td class="mono">${esc(p.nomor)}</td>
      <td><b>${esc(p.nama)}</b><br><small>${esc(p.asalSekolah)}</small></td>
      <td class="mono">${esc(p.nisn)}</td>
      <td><span class="chip">${esc(p.jurusan1)}</span>${p.jurusan2 ? `<span class="chip">${esc(p.jurusan2)}</span>` : ""}</td>
      <td>${esc(p.hp)}</td>
      <td><select class="st-select ${stClass[p.status] || ""}" data-id="${p.id}">${STATUS.map(s => `<option${s === p.status ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></td>
      <td><button class="icon-btn" data-del="${p.id}" title="Hapus" type="button">🗑</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Belum ada data yang cocok.</td></tr>`;
  $("#dashInfo").textContent = `Menampilkan ${rows.length} dari ${DATA.length} pendaftar · klik baris untuk detail lengkap.`;
}

$("#q").addEventListener("input", render);
$("#fStatus").addEventListener("change", render);
$("#fJurusan").addEventListener("change", render);
$("#btnRefresh").addEventListener("click", muatData);
$("#btnLogout").addEventListener("click", () => keluar());

$("#tbody").addEventListener("click", async e => {
  const del = e.target.closest("[data-del]");
  if (del) {
    const p = DATA.find(x => x.id === del.dataset.del);
    if (!p || !confirm(`Hapus data ${p.nama} (${p.nomor})?`)) return;
    try { await api("/api/admin/pendaftar/" + p.id, { method: "DELETE" }); toast("Data dihapus"); muatData(); }
    catch (err) { toast(err.message, "err"); }
    return;
  }
  if (e.target.closest("select")) return;
  const tr = e.target.closest("tr[data-id]");
  if (tr) detail(tr.dataset.id);
});

$("#tbody").addEventListener("change", async e => {
  const sel = e.target.closest(".st-select");
  if (!sel) return;
  try {
    await api("/api/admin/pendaftar/" + sel.dataset.id, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
    const p = DATA.find(x => x.id === sel.dataset.id);
    if (p) p.status = sel.value;
    render();
    toast("Status diperbarui");
  } catch (err) {
    toast(err.message, "err");
    muatData();
  }
});

function detail(id) {
  const p = DATA.find(x => x.id === id);
  if (!p) return;
  const nj = k => (JUR.find(j => j.kode === k) || {}).nama || k || "-";
  const rows = [
    ["Nomor", p.nomor], ["Status", p.status], ["Nama", p.nama], ["NISN", p.nisn], ["NIK", p.nik],
    ["Nilai Rata-rata", p.nilaiRata || "-"],
    ["TTL", p.tempatLahir + ", " + tgl(p.tanggalLahir)],
    ["Jenis Kelamin", p.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"],
    ["Asal Sekolah", p.asalSekolah], ["Jurusan 1", nj(p.jurusan1)],
    ["Jurusan 2", p.jurusan2 ? nj(p.jurusan2) : "-"], ["Alamat", p.alamat],
    ["HP/WA Siswa", p.hp], ["Email", p.email || "-"],
    ["Orang Tua/Wali", p.namaOrtu], ["HP/WA Ortu", p.hpOrtu],
    ["Waktu Daftar", new Date(p.createdAt).toLocaleString("id-ID")]
  ];
  const berkasHtml = `
    <div class="info-row">
      <span class="k">Berkas & Folder</span>
      <span class="v" style="display:flex;gap:6px;flex-wrap:wrap;">
        ${p.linkKK ? `<a class="btn ghost small" href="${esc(p.linkKK)}" target="_blank" rel="noopener">📄 KK</a>` : ""}
        ${p.linkAkta ? `<a class="btn ghost small" href="${esc(p.linkAkta)}" target="_blank" rel="noopener">📄 Akta</a>` : ""}
        ${p.linkRapor ? `<a class="btn ghost small" href="${esc(p.linkRapor)}" target="_blank" rel="noopener">📄 Rapor</a>` : ""}
        ${p.linkFoto ? `<a class="btn ghost small" href="${esc(p.linkFoto)}" target="_blank" rel="noopener">🖼️ Foto</a>` : ""}
        ${p.linkFolder ? `<a class="btn primary small" href="${esc(p.linkFolder)}" target="_blank" rel="noopener">📁 Folder</a>` : ""}
      </span>
    </div>
  `;
  $("#modalBody").innerHTML = rows.map(([k, v]) => `<div class="info-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("") + berkasHtml;
  $("#overlay").hidden = false;
}

$("#modalClose").addEventListener("click", () => $("#overlay").hidden = true);
$("#overlay").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#overlay").hidden = true; });

$("#btnCsv").addEventListener("click", () => {
  const head = ["Nomor", "Nama", "NISN", "NIK", "NilaiRata", "TempatLahir", "TanggalLahir", "JK", "AsalSekolah", "Alamat", "HP", "Email", "NamaOrtu", "HPortu", "Jurusan1", "Jurusan2", "Status", "WaktuDaftar"];
  const baris = DATA.map(p => [p.nomor, p.nama, p.nisn, p.nik, p.nilaiRata, p.tempatLahir, p.tanggalLahir, p.jenisKelamin, p.asalSekolah, p.alamat, p.hp, p.email, p.namaOrtu, p.hpOrtu, p.jurusan1, p.jurusan2, p.status, p.createdAt]);
  const csv = "\uFEFF" + [head, ...baris].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "pendaftar-spmb.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV diunduh ⬇️");
});

if (token) tampilDash();