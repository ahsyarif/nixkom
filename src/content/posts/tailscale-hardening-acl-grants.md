---
title: Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock
date: 2026-11-14T10:04:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - grants
  - tailnet-lock
  - keamanan
  - zero-trust
description: "Cegah peretas berpindah antar-server lewat segmentasi grants berbasis tag, autogroup, uji policy otomatis, dan perlindungan Tailnet Lock."
---

Di banyak jaringan VPS, kesalahan yang sering terjadi setelah semua server terhubung ke VPN adalah **membiarkan semua perangkat saling mengakses secara bebas**. Secara bawaan pun, policy awal Tailscale mengizinkan semua node di tailnet saling berkomunikasi.

Masalahnya: bayangkan kamu punya satu web server (`tag:web`) dan satu server database (`tag:db`), plus laptop kerjamu di jaringan Tailscale yang sama. Jika suatu hari aplikasi web memiliki celah keamanan sehingga penyerang berhasil masuk ke shell web server, apa yang bisa mereka lakukan? Tanpa segmentasi, dari web server itu mereka bisa langsung mencoba menyusup ke server database, server lain, bahkan memindai laptopmu!

Dalam keamanan siber, teknik peretas berpindah dari satu mesin yang jebol ke mesin lain di jaringan internal disebut **lateral movement** (*pergerakan menyamping*). Di bagian ini, kita akan memutus jalur itu dengan **`grants`**, **`tag`**, **`tests`**, dan lapisan kriptografis **`Tailnet Lock`**.

> Jika kamu belum pernah menyentuh konsep policy `grants`, kamu bisa membaca pengantar dasarnya dulu di [pengenalan Tailscale Grants untuk pemula](/posts/tailscale-grants-pemula/).

---

## Analogi Sederhana: Sekat Kedap Air di Kapal Selam

Kapal selam dibagi menjadi beberapa kompartemen dengan pintu baja kedap air:

- Jika satu kompartemen bocor, pintu kedap air ditutup supaya air **tidak membanjiri seluruh kapal**.
- Dengan **Grants berbasis Tag**, setiap jenis server (`tag:web`, `tag:db`) berada di kompartemennya masing-masing. Web server hanya diberi pipa kecil menuju port database (`5432`), dan dilarang keras membuka jalur SSH atau akses apa pun ke server lain maupun ke perangkat admin.

---

## Langkah 1: Terapkan Segmentasi *Deny-by-Default* dengan `grants`

Begitu aturan bawaan *"allow all"* (`*` ke `*`) kamu hapus dari file policy di **Access controls**, Tailscale bekerja dengan prinsip **deny-by-default**: apa pun yang tidak tertulis secara eksplisit di dalam `"grants"`, otomatis **diblokir**.

Berikut contoh nyata arsitektur 3 zona (Admin -> Web & Database, Web -> Database saja):

```json
{
  "tagOwners": {
    "tag:web": ["autogroup:admin"],
    "tag:db": ["autogroup:admin"]
  },
  "grants": [
    {
      "src": ["autogroup:admin"],
      "dst": ["tag:web", "tag:db"],
      "ip": ["tcp:22", "tcp:443", "tcp:9100"]
    },
    {
      "src": ["tag:web"],
      "dst": ["tag:db"],
      "ip": ["tcp:5432"]
    }
  ],
  "ssh": [
    {
      "action": "check",
      "src": ["autogroup:admin"],
      "dst": ["tag:web", "tag:db"],
      "users": ["autogroup:nonroot"]
    }
  ]
}
```

Mari lihat seketat apa perlindungan dari konfigurasi di atas:

1. **Admin (`autogroup:admin`)** bisa mengakses `tag:web` dan `tag:db` hanya pada port SSH (`22`), dashboard privat HTTPS (`443` dari `tailscale serve`), dan agen monitoring (`9100`). Admin tetap melewati `Tailscale SSH` dengan Check Mode.
2. **Server web (`tag:web`)** **hanya** bisa menghubungi `tag:db` di port PostgreSQL (`tcp:5432`). Server web **tidak bisa** SSH ke server database, tidak bisa `ping` bebas ke mana-mana, dan **sama sekali tidak bisa menghubungi laptop/HP admin**!
3. **Server database (`tag:db`)** **tidak punya izin** memulai koneksi ke server web ataupun ke perangkat lain. Kalau port database sudah terkunci, aliran data hanya satu arah sesuai kebutuhan aplikasi.
4. **Sesama perangkat admin pribadi (opsional):** Jika kamu punya laptop dan HP di akun yang sama dan tetap ingin saling terhubung (misalnya untuk mengirim file), kamu bisa menambahkan satu aturan terpisah dengan `"src": ["autogroup:member"]`, `"dst": ["autogroup:self"]`, `"ip": ["*"]` agar hanya perangkat milikmu sendiri yang bebas berkomunikasi tanpa menyentuh server bertag.

---

## Langkah 2: Wajib Tambahkan Blok `"tests"` Agar Tidak Salah Kunci

Mengedit file JSON policy tanpa pengujian rawan salah ketik—misalnya lupa menuliskan aturan untuk admin, atau malah salah menulis `"*"` sehingga membuka akses database ke semua perangkat.

Tailscale menyediakan blok **`"tests"`** di file policy yang otomatis dijalankan **setiap kali kamu klik Save**. Jika ada aturan yang melanggar ekspektasi, Tailscale akan **menolak menyimpan** perubahan tersebut!

Tambahkan blok `"tests"` ini di bagian bawah file policy-mu:

```json
{
  "tests": [
    {
      "src": "tag:web",
      "accept": ["tag:db:5432"],
      "deny": ["tag:db:22", "tag:db:9100", "tag:web:22"]
    },
    {
      "src": "tag:db",
      "deny": ["tag:web:80", "tag:web:443", "tag:web:22"]
    }
  ]
}
```

Artinya:

- Tes pertama memastikan `tag:web` **wajib boleh** mengakses PostgreSQL (`5432`) di `tag:db`, dan **wajib ditolak** jika mencoba mengakses SSH (`22`) atau metrik (`9100`) di `tag:db` maupun antar-server `tag:web`.
- Tes kedua memastikan `tag:db` **dilarang keras** mengakses port apa pun di `tag:web`.

Kalau suatu hari kamu atau rekan tim tidak sengaja menambahkan aturan terlalu longgar, `"tests"` langsung membunyikan alarm sebelum aturan berbahaya sempat aktif!

---

## Langkah 3: Lapisan Kriptografis Lanjutan — **Tailnet Lock**

Semua aturan di atas mengandalkan satu asumsi penting: *kita percaya server koordinasi Tailscale selalu jujur mendistribusikan daftar kunci publik perangkat milik kita saja.*

Bagi mayoritas pemula dan tim kecil, keamanan server koordinasi Tailscale sudah sangat memadai. Namun, untuk infrastruktur produksi sensitif—di mana kamu ingin jaminan matematis bahwa **bahkan jika server koordinasi Tailscale diretas sekali pun, tidak ada perangkat penyusup yang bisa disuntikkan diam-diam ke jaringanmu**—Tailscale punya fitur bernama **Tailnet Lock**.

### Bagaimana Cara Kerja Tailnet Lock?

Secara sederhana, Tailnet Lock menggunakan prinsip **Trust-on-First-Use (TOFU)** dengan tanda tangan kriptografis:

1. Kamu memilih satu atau dua perangkat admin tepercaya (misalnya laptop utamamu + laptop cadangan) sebagai **signing node** (*node penandatangan*).
2. Saat Tailnet Lock diaktifkan, **setiap server baru** yang masuk ke jaringanmu **tidak langsung dipercaya** oleh server lain sampai salah satu *signing node* tepercaya menandatangani kunci publiknya (*node key*) secara langsung dari CLI.
3. Jadi meski ada pihak jahat mencoba memasukkan komputer asing lewat server koordinasi, komputer milikmu akan menolak berkomunikasi dengannya karena tidak memiliki tanda tangan dari *signing node*-mu.

### Gambaran Alur Pemakaian `tailscale lock`

Periksa dulu status Tailnet Lock dan kunci penandatangan (*tailnet lock key*) di dua perangkat admin tepercaya:

```bash
tailscale lock status
```

Perintah tersebut menampilkan baris `This node's tailnet lock key: tlpub:...`. Catat `tlpub:...` dari perangkat utamamu (dan sebaiknya minimal satu perangkat admin cadangan, agar tidak bergantung pada satu laptop saja).

Lalu, inisialisasi Tailnet Lock dari laptop utama dan buat kode darurat (*disablement secret*):

```bash
tailscale lock init --gen-disablements 1 tlpub:KUNCI_LAPTOP_UTAMA tlpub:KUNCI_CADANGAN
```

> **PERINGATAN SANGAT PENTING:**  
> Segera simpan **disablement secret** (`disablement-secret-...`) yang dicetak ke layar ke dalam **password manager** yang aman (terpisah dari laptop utama)! Jika semua perangkat penandatanganmu rusak/hilang bersamaan, satu-satunya cara mematikan Tailnet Lock tanpa kehilangan akses tailnet adalah menjalankan `tailscale lock disable <disablement-secret>`.

Setelah aktif, setiap kali kamu menambahkan server Linux baru dengan `tailscale up --auth-key=...`, server tersebut berstatus menunggu tanda tangan (*unsigned*). Cek node key yang tertunda, verifikasi kecocokannya, lalu tanda tangani dari laptop admin:

```bash
tailscale lock status
sudo tailscale lock sign nodekey:KODE_NODE_BARU
```

*(Kamu juga bisa mengonfigurasi auth key atau signing node tertentu sebagai auto-approver bila memakai otomasi skala besar, namun untuk lingkungan kecil hingga menengah, menandatangani manual dari laptop admin sudah sangat aman dan mudah diaudit.)*

---

## Checklist Singkat Sebelum Lanjut

- [x] Aturan bawaan *allow-all* di `grants` sudah diganti menjadi aturan spesifik per tag & port.
- [x] Server web (`tag:web`) hanya bisa menyentuh port layanan yang dibutuhkan di server DB (`tag:db`), bukan SSH atau perangkat admin.
- [x] Blok `"tests"` sudah tersimpan di policy file dan lulus tanpa error.
- [x] Kamu memahami fungsi **Tailnet Lock** (dan wajib menyimpan *disablement secret* di tempat aman jika memutuskan mengaktifkannya).

Sekarang, jaringan antar-server sudah tersegmentasi rapat. Namun bagaimana dengan aplikasi di dalam server itu sendiri—seperti database PostgreSQL atau dashboard web admin Grafana/Portainer—agar tidak bocor lewat interface lokal atau terbuka tanpa HTTPS? Itu yang akan kita bereskan di **Bagian 6**.

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. [Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key](/posts/tailscale-hardening-tag-authkey/)
3. [Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik](/posts/tailscale-hardening-firewall-port/)
4. [Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode](/posts/tailscale-hardening-tailscale-ssh/)
5. **Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock** *(sedang dibaca)*
6. [Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve](/posts/tailscale-hardening-layanan-internal/)
7. [Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat](/posts/tailscale-hardening-audit-pemulihan/)

---

## Referensi

- [Tailscale Docs: Grants & access controls](https://tailscale.com/docs/features/access-control/grants)
- [Tailscale Docs: Tailnet policy file syntax & tests](https://tailscale.com/docs/reference/syntax/policy-file)
- [Tailscale Docs: Tailnet Lock](https://tailscale.com/docs/features/tailnet-lock)
- [Tailscale CLI Reference: `tailscale lock`](https://tailscale.com/docs/reference/tailscale-cli/lock)
