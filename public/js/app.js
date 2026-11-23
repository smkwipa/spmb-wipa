const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tgl = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };

let INFO = null;
let lastDaftar = null;

const titles = {
  beranda: "Beranda",
  jurusan: "Program Keahlian",
  alur: "Alur & Syarat",
  daftar: "Formulir Pendaftaran",
  cek: "Cek Status"
};

const stClass = {
  "Menunggu Verifikasi": "st-wait",
  "Terverifikasi": "st-verify",
  "Diterima": "st-ok",
  "Ditolak": "st-no"
};

function showPage(id) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === id));
  $$("[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === id));
  $("#winTitle").textContent = (titles[id] || "SPMB") + " — SPMB";
  scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-page]").forEach(el => el.addEventListener("click", e => {
  e.preventDefault();
  showPage(el.dataset.page);
}));

$("#tlRed")?.addEventListener("click", () => toast("Jendelanya tidak bisa ditutup, ini website 😄"));
$("#tlYellow")?.addEventListener("click", () => $(".window")?.classList.toggle("shaded"));
$("#tlGreen")?.addEventListener("click", () => $(".window")?.classList.toggle("zoomed"));

const namaJurusan = k => (INFO?.jurusan?.find(j => j.kode === k) || {}).nama || k || "-";

function renderInfo(info) {
  INFO = info;
  $$(".ta").forEach(el => { el.textContent = info.tahunAjaran || ""; });

  const totalKuota = (info.jurusan || []).reduce((acc, j) => acc + Number(j.kuota || 0), 0);
  if ($("#statPendaftar")) $("#statPendaftar").textContent = info.totalPendaftar ?? 0;
  if ($("#statKuota")) $("#statKuota").textContent = totalKuota;

  if ($("#infoRows")) {
    const rows = [
      ["NPSN", info.npsn],
      ["Akreditasi", info.akreditasi],
      ["Kepala Sekolah", info.kepalaSekolah],
      ["Alamat", info.alamat],
      ["Telepon", info.telepon],
      ["WhatsApp", info.whatsapp],
      ["Email", info.email]
    ];
    $("#infoRows").innerHTML = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<div class="info-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`)
      .join("");
  }

  if ($("#jurusanGrid")) {
    $("#jurusanGrid").innerHTML = (info.jurusan || []).map(j => {
      const kuota = Number(j.kuota || 0);
      const terisi = Number(j.terisi || 0);
      const pct = kuota > 0 ? Math.min(100, Math.round((terisi / kuota) * 100)) : 0;
      return `
        <div class="j-card">
          <div class="j-top">
            <span class="j-icon">${esc(j.ikon || "🎓")}</span>
            <span class="chip">${esc(j.kode)}</span>
          </div>
          <h3>${esc(j.nama)}</h3>
          <p>${esc(j.deskripsi || "")}</p>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="kuota-txt">Terisi ${terisi} / ${kuota} kuota (${pct}%)</div>
        </div>`;
    }).join("");
  }

  if ($("#alurList")) {
    $("#alurList").innerHTML = (info.gelombang || []).map((g, idx) => `
      <div class="step">
        <div class="step-n">${idx + 1}</div>
        <div>
          <b>${esc(g.nama)} (${esc(g.waktu)})</b>
          <small>${esc(g.info)}</small>
        </div>
      </div>`).join("");
  }

  if ($("#syaratList")) {
    $("#syaratList").innerHTML = (info.syarat || []).map(s => `<li>${esc(s)}</li>`).join("");
  }

  const sel1 = $("#selJ1");
  const sel2 = $("#selJ2");
  if (sel1 && sel2) {
    const prev1 = sel1.value;
    const prev2 = sel2.value;
    sel1.innerHTML = `<option value="">— Pilih Jurusan —</option>`;
    sel2.innerHTML = `<option value="">— Tidak ada —</option>`;
    (info.jurusan || []).forEach(j => {
      sel1.add(new Option(`${j.kode} — ${j.nama}`, j.kode));
      sel2.add(new Option(`${j.kode} — ${j.nama}`, j.kode));
    });
    if (prev1) sel1.value = prev1;
    if (prev2) sel2.value = prev2;
  }
}

async function muatInfo() {
  try {
    const r = await fetch("/api/info");
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.pesan || "Gagal memuat info SPMB");
    renderInfo(j);
  } catch (err) {
    toast(err.message || "Gagal memuat data awal", "err");
  }
}

$("#formDaftar")?.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("#btnDaftar");
  if (btn) btn.disabled = true;

  try {
    const fd = new FormData(e.currentTarget);
    const payload = {
      nama: fd.get("nama"),
      nisn: fd.get("nisn"),
      nik: fd.get("nik"),
      tempatLahir: fd.get("tempatLahir"),
      tanggalLahir: fd.get("tanggalLahir"),
      jenisKelamin: fd.get("jenisKelamin"),
      asalSekolah: fd.get("asalSekolah"),
      jurusan1: fd.get("jurusan1"),
      jurusan2: fd.get("jurusan2"),
      alamat: fd.get("alamat"),
      hp: fd.get("hp"),
      email: fd.get("email"),
      namaOrtu: fd.get("namaOrtu"),
      hpOrtu: fd.get("hpOrtu"),
      setuju: fd.get("setuju") === "on"
    };

    const r = await fetch("/api/daftar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.pesan || "Pendaftaran gagal dikirim");

    lastDaftar = {
      nomor: j.nomor,
      nama: payload.nama,
      jurusan1: namaJurusan(payload.jurusan1),
      jurusan2: payload.jurusan2 ? namaJurusan(payload.jurusan2) : ""
    };

    if ($("#resNomor")) $("#resNomor").textContent = lastDaftar.nomor;
    if ($("#resNama")) $("#resNama").textContent = `Nama: ${lastDaftar.nama}`;
    if ($("#resJurusan")) {
      $("#resJurusan").textContent = `Jurusan 1: ${lastDaftar.jurusan1}` + (lastDaftar.jurusan2 ? ` · Jurusan 2: ${lastDaftar.jurusan2}` : "");
    }

    e.currentTarget.hidden = true;
    if ($("#daftarIntro")) $("#daftarIntro").hidden = true;
    if ($("#daftarResult")) $("#daftarResult").hidden = false;
    toast("Pendaftaran berhasil disimpan 🎉");
    muatInfo();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
});

$("#btnCetak")?.addEventListener("click", () => window.print());

$("#btnLagi")?.addEventListener("click", () => {
  const form = $("#formDaftar");
  if (form) {
    form.reset();
    form.hidden = false;
  }
  if ($("#daftarIntro")) $("#daftarIntro").hidden = false;
  if ($("#daftarResult")) $("#daftarResult").hidden = true;
});

$("#formCek")?.addEventListener("submit", async e => {
  e.preventDefault();
  const nomor = ($("#cekNomor")?.value || "").trim();
  const box = $("#cekResult");
  if (!nomor || !box) return;

  try {
    const r = await fetch("/api/status/" + encodeURIComponent(nomor));
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.pesan || "Data tidak ditemukan");

    const d = j.data;
    const badgeCls = stClass[d.status] || "st-wait";
    box.innerHTML = `
      <div class="info-row"><span class="k">Nomor</span><span class="v mono"><b>${esc(d.nomor)}</b></span></div>
      <div class="info-row"><span class="k">Nama</span><span class="v">${esc(d.nama)}</span></div>
      <div class="info-row"><span class="k">Asal Sekolah</span><span class="v">${esc(d.asalSekolah)}</span></div>
      <div class="info-row"><span class="k">Jurusan 1</span><span class="v">${esc(d.jurusan1)}</span></div>
      <div class="info-row"><span class="k">Jurusan 2</span><span class="v">${esc(d.jurusan2)}</span></div>
      <div class="info-row"><span class="k">Tanggal Daftar</span><span class="v">${esc(tgl(d.tanggalDaftar))}</span></div>
      <div class="info-row"><span class="k">Status</span><span class="v"><span class="st ${badgeCls}">${esc(d.status)}</span></span></div>
    `;
    box.hidden = false;
  } catch (err) {
    box.hidden = false;
    box.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    toast(err.message, "err");
  }
});

muatInfo();
