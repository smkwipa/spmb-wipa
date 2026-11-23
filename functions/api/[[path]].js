const STATUS_LIST = ["Menunggu Verifikasi", "Terverifikasi", "Diterima", "Ditolak"];

const SCHOOL = {
  nama: "SMK Widya Praja Ungaran",
  tagline: "SMK Bisa Hebat!",
  npsn: "20320233",
  akreditasi: "A",
  kepalaSekolah: "Tri Yuliani, S.Pd",
  alamat: "Jl. Jenderal Gatot Subroto No. 63, Bandarjo, Ungaran Barat, Kab. Semarang, Jawa Tengah 50517",
  telepon: "(024) 6923124",
  whatsapp: "0821-4030-1908",
  email: "smk.wpung@yahoo.co.id",
  website: "https://www.smkwidyapraja.sch.id",
  tahunAjaran: "2027/2028",
  jurusan: [
    { kode: "AK", nama: "Akuntansi", kuota: 72, ikon: "📊", deskripsi: "Belajar pembukuan, laporan keuangan, pajak, dan aplikasi akuntansi." },
    { kode: "MP", nama: "Manajemen Perkantoran", kuota: 72, ikon: "🗂️", deskripsi: "Administrasi modern, kearsipan digital, layanan bisnis, dan public speaking." },
    { kode: "BS", nama: "Busana", kuota: 36, ikon: "🧵", deskripsi: "Desain busana, pola, jahit, sampai custom made." },
    { kode: "KL", nama: "Kuliner", kuota: 72, ikon: "🍳", deskripsi: "Pengolahan makanan, pastry bakery, dan kewirausahaan kuliner." },
    { kode: "TO", nama: "Teknik Otomotif", kuota: 72, ikon: "🏍️", deskripsi: "Teknik dan bisnis sepeda motor: servis, tune-up, kelistrikan." },
    { kode: "DKV", nama: "Desain Komunikasi Visual", kuota: 72, ikon: "🎨", deskripsi: "Desain grafis, ilustrasi digital, fotografi, dan konten kreatif." }
  ],
  gelombang: [
    { nama: "Gelombang 1", waktu: "4 Januari – 27 Maret 2027", info: "Pendaftaran awal, pilihan jurusan masih lengkap" },
    { nama: "Gelombang 2", waktu: "29 Maret – 26 Juni 2027", info: "Pendaftaran reguler menjelang kelulusan SMP/MTs" },
    { nama: "Gelombang 3", waktu: "28 Juni – 10 Juli 2027", info: "Pendaftaran sisa kuota" },
    { nama: "Daftar Ulang & MPLS", waktu: "12 – 17 Juli 2027", info: "Herregistrasi siswa diterima dan masa pengenalan sekolah" }
  ],
  syarat: [
    "Fotokopi ijazah / Surat Keterangan Lulus SMP/MTs",
    "Fotokopi rapor semester 1–5",
    "Fotokopi Kartu Keluarga dan akta kelahiran",
    "NISN aktif dan valid",
    "Pas foto 3x4 terbaru (2 lembar)",
    "Mengisi formulir online, lalu verifikasi berkas ke sekolah"
  ]
};

const tokens = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function auth(request) {
  const t = (request.headers.get("authorization") || "").replace("Bearer ", "");
  if (!tokens.has(t) || tokens.get(t) < Date.now()) {
    tokens.delete(t);
    return json({ ok: false, pesan: "Sesi habis, silakan login ulang" }, 401);
  }
  return null;
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

// Helper untuk memanggil Google Apps Script
async function callGAS(env, payload) {
  if (!env.GAS_URL) throw new Error("GAS_URL belum diatur di Environment Variables Cloudflare");
  const res = await fetch(env.GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: env.GAS_SECRET || "RAHASIA_SPMB_WP_2027",
      ...payload
    })
  });
  return await res.json();
}

// ===== ROUTES =====

async function handleInfo(env) {
  const res = await callGAS(env, { action: "getAll" });
  if (!res.ok) return json({ ok: false, pesan: res.pesan }, 500);
  const all = res.data || [];
  const jurusan = SCHOOL.jurusan.map(j => ({
    ...j,
    terisi: all.filter(p => p.status !== "Ditolak" && p.jurusan1 === j.kode).length
  }));
  return json({ ...SCHOOL, jurusan, totalPendaftar: all.length });
}

async function handleDaftar(request, env) {
  const b = await readBody(request);
  const teks = v => String(v || "").trim().slice(0, 300);
  const d = {
    nama: teks(b.nama),
    nisn: teks(b.nisn),
    nik: teks(b.nik),
    tempat_lahir: teks(b.tempatLahir),
    tanggal_lahir: teks(b.tanggalLahir),
    jenis_kelamin: teks(b.jenisKelamin),
    asal_sekolah: teks(b.asalSekolah),
    alamat: teks(b.alamat),
    hp: teks(b.hp),
    email: teks(b.email),
    nama_ortu: teks(b.namaOrtu),
    hp_ortu: teks(b.hpOrtu),
    jurusan1: teks(b.jurusan1),
    jurusan2: teks(b.jurusan2)
  };
  const hpOK = v => /^(?:\+62|62|0)8\d{7,11}$/.test(v);
  const kode = SCHOOL.jurusan.map(j => j.kode);
  if (d.nama.length < 3) return json({ ok: false, pesan: "Nama lengkap minimal 3 huruf" }, 400);
  if (!/^\d{10}$/.test(d.nisn)) return json({ ok: false, pesan: "NISN harus 10 digit angka" }, 400);
  if (!/^\d{16}$/.test(d.nik)) return json({ ok: false, pesan: "NIK harus 16 digit angka" }, 400);
  if (!d.tempat_lahir || !d.tanggal_lahir) return json({ ok: false, pesan: "Tempat dan tanggal lahir wajib diisi" }, 400);
  if (!["L", "P"].includes(d.jenis_kelamin)) return json({ ok: false, pesan: "Pilih jenis kelamin" }, 400);
  if (d.asal_sekolah.length < 3) return json({ ok: false, pesan: "Asal sekolah wajib diisi" }, 400);
  if (d.alamat.length < 10) return json({ ok: false, pesan: "Alamat terlalu singkat" }, 400);
  if (!hpOK(d.hp)) return json({ ok: false, pesan: "Nomor HP/WA siswa tidak valid" }, 400);
  if (!d.nama_ortu) return json({ ok: false, pesan: "Nama orang tua/wali wajib diisi" }, 400);
  if (!hpOK(d.hp_ortu)) return json({ ok: false, pesan: "Nomor HP/WA orang tua tidak valid" }, 400);
  if (!kode.includes(d.jurusan1)) return json({ ok: false, pesan: "Pilihan jurusan 1 tidak valid" }, 400);
  if (d.jurusan2 && (!kode.includes(d.jurusan2) || d.jurusan2 === d.jurusan1)) return json({ ok: false, pesan: "Pilihan jurusan 2 harus berbeda dari pilihan 1" }, 400);
  if (b.setuju !== true) return json({ ok: false, pesan: "Centang pernyataan kebenaran data" }, 400);

  const tahun = SCHOOL.tahunAjaran.slice(0, 4);
  const res = await callGAS(env, { action: "insert", tahun, data: d });

  if (!res.ok) return json({ ok: false, pesan: res.pesan }, res.status || 500);
  return json({ ok: true, nomor: res.nomor });
}

async function handleStatus(nomor, env) {
  const res = await callGAS(env, { action: "getAll" });
  if (!res.ok) return json({ ok: false, pesan: res.pesan }, 500);
  const data = (res.data || []).find(p => p.nomor.toLowerCase() === nomor.toLowerCase());
  if (!data) return json({ ok: false, pesan: "Nomor pendaftaran tidak ditemukan" }, 404);
  
  const nj = k => (SCHOOL.jurusan.find(j => j.kode === k) || {}).nama || k;
  return json({
    ok: true,
    data: {
      nomor: data.nomor,
      nama: data.nama,
      asalSekolah: data.asal_sekolah,
      jurusan1: nj(data.jurusan1),
      jurusan2: data.jurusan2 ? nj(data.jurusan2) : "-",
      status: data.status,
      tanggalDaftar: data.created_at
    }
  });
}

async function handleLogin(request, env) {
  const { password } = await readBody(request);
  const adminPass = env.ADMIN_PASSWORD || "Dimas123";
  if (password !== adminPass) return json({ ok: false, pesan: "Password salah" }, 401);
  const token = crypto.randomUUID();
  tokens.set(token, Date.now() + 12 * 3600 * 1000);
  return json({ ok: true, token });
}

async function handleGetPendaftar(env) {
  const res = await callGAS(env, { action: "getAll" });
  if (!res.ok) return json({ ok: false, pesan: res.pesan }, 500);
  
  const toCamel = p => ({
    id: p.id, nomor: p.nomor, nama: p.nama, nisn: p.nisn, nik: p.nik,
    tempatLahir: p.tempat_lahir, tanggalLahir: p.tanggal_lahir,
    jenisKelamin: p.jenis_kelamin, asalSekolah: p.asal_sekolah,
    alamat: p.alamat, hp: p.hp, email: p.email,
    namaOrtu: p.nama_ortu, hpOrtu: p.hp_ortu,
    jurusan1: p.jurusan1, jurusan2: p.jurusan2,
    status: p.status, createdAt: p.created_at
  });
  
  const sorted = (res.data || []).reverse().map(toCamel);
  return json({ ok: true, data: sorted, statusList: STATUS_LIST, jurusan: SCHOOL.jurusan });
}

async function handleUpdateStatus(id, request, env) {
  const { status } = await readBody(request);
  if (!STATUS_LIST.includes(status)) return json({ ok: false, pesan: "Status tidak valid" }, 400);
  const res = await callGAS(env, { action: "updateStatus", id, status });
  if (!res.ok) return json({ ok: false, pesan: res.pesan }, 500);
  return json({ ok: true });
}

async function handleDelete(id, env) {
  const res = await callGAS(env, { action: "delete", id });
  if (!res.ok) return json({ ok: false, pesan: res.pesan }, 500);
  return json({ ok: true });
}

// ===== MAIN HANDLER =====

export async function onRequest(context) {
  const { request, params, env } = context;
  const path = params.path || [];
  const method = request.method;

  try {
    if (path[0] === "info" && method === "GET") return await handleInfo(env);
    if (path[0] === "daftar" && method === "POST") return await handleDaftar(request, env);
    if (path[0] === "status" && path[1] && method === "GET") return await handleStatus(path[1], env);
    if (path[0] === "admin" && path[1] === "login" && method === "POST") return await handleLogin(request, env);
    if (path[0] === "admin" && path[1] === "pendaftar" && !path[2] && method === "GET") {
      const err = auth(request); if (err) return err;
      return await handleGetPendaftar(env);
    }
    if (path[0] === "admin" && path[1] === "pendaftar" && path[2] && method === "PATCH") {
      const err = auth(request); if (err) return err;
      return await handleUpdateStatus(path[2], request, env);
    }
    if (path[0] === "admin" && path[1] === "pendaftar" && path[2] && method === "DELETE") {
      const err = auth(request); if (err) return err;
      return await handleDelete(path[2], env);
    }
  } catch (e) {
    return json({ ok: false, pesan: e.message }, 500);
  }

  return json({ ok: false, pesan: "Endpoint tidak ditemukan" }, 404);
}