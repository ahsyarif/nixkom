---
title: "Tailscale SSH dan Check Mode: SSH tanpa kelola kunci manual"
date: 2026-11-14T10:03:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - ssh
  - keamanan
  - pemula
description: "Aktifkan Tailscale SSH dan Check Mode di server Linux untuk login berbasis identitas tailnet tanpa mengelola authorized_keys, dengan akses darurat tetap siap."
---

Di [artikel akses SSH lewat Tailscale](/posts/tailscale-ssh-debian/), kita memindahkan jalur OpenSSH biasa ke IP Tailscale supaya tidak terbuka ke internet. Itu sudah sangat bagus—tetapi di dalam tiap server, kamu masih harus menyalin file kunci publik `~/.ssh/authorized_keys` secara manual untuk setiap laptop dan setiap anggota tim, serta menghapusnya satu per satu saat ada anggota yang keluar.

**Tailscale SSH** melangkah satu tingkat lebih jauh: daemon Tailscale (`tailscaled`) sendiri bertindak sebagai server SSH pada jaringan tailnet, menggantikan kebutuhan kunci SSH statis (`id_ed25519` / `authorized_keys`) dengan identitas perangkat dan akun tailnet yang diawasi terpusat.

---

## Analogi Sederhana: Kunci Loker Manual vs Kartu Akses Terpusat

- **OpenSSH lewat jalur Tailscale:** Satpam gedung mengecek kartu Tailscale-mu di gerbang, tetapi di depan pintu kantor kamu masih harus mengeluarkan kunci besi (`id_ed25519`) yang terdaftar di buku catatan pintu (`authorized_keys`). Jika kunci hilang atau pegawai keluar, kamu harus keliling ke setiap server mengganti gembok.
- **Tailscale SSH:** Begitu satpam Tailscale mengizinkan, pintu kantor ikut terbuka otomatis sesuai kebijakan di **Access controls**. Satu klik di Admin Console untuk mencabut akses seseorang langsung memutus hak SSH-nya ke puluhan server sekaligus.

---

## Langkah 1: Aktifkan Tailscale SSH di Server Linux

Di server Linux (Debian/Ubuntu) yang sudah terhubung ke Tailscale, cukup jalankan:

```bash
sudo tailscale set --ssh
```

*(Kamu juga bisa langsung menyalakannya sejak awal instalasi dengan `sudo tailscale up --auth-key="$TS_AUTHKEY" --advertise-tags=tag:web --ssh`.)*

Bagaimana dengan `sshd` (OpenSSH server) yang sudah berjalan di port `22`?  
Tenang, tidak bentrok! Tailscale SSH hanya mencegat koneksi port `22` yang datang melalui antarmuka jaringan **Tailscale (`100.x.y.z`)**, bukan yang datang dari `localhost` atau jaringan lokal lain.

---

## Langkah 2: Atur Kebijakan SSH & **Check Mode** di Policy File

Mengaktifkan `--ssh` di server saja belum mengizinkan siapa pun masuk sebelum diizinkan dalam blok `"ssh"` pada **Access controls** di Tailscale Admin Console.

Salah satu fitur keamanan paling ampuh di Tailscale SSH adalah **`"action": "check"` (Check Mode)**. Jika mode `"accept"` mengizinkan login otomatis selama laptop tersambung ke tailnet, mode `"check"` memaksa admin mengklik tautan verifikasi ulang di browser (login SSO/MFA penyedia identitasmu) setiap periode waktu tertentu sebelum sesi SSH dibuka!

Ini mencegah kejadian fatal apabila laptopmu tertinggal dalam keadaan layar tidak terkunci lalu seseorang mengetik `ssh root@server-produksi`.

Tambahkan bagian `"ssh"` ini di tailnet policy file:

```json
{
  "ssh": [
    {
      "action": "check",
      "src": ["autogroup:admin"],
      "dst": ["tag:web", "tag:db"],
      "users": ["autogroup:nonroot", "root"]
    }
  ]
}
```

Mari bedah tiap barisnya agar jelas:

- `"action": "check"`: Sebelum mengizinkan sesi terminal terbuka, Tailscale menampilkan tautan autentikasi singkat di terminal (`To authenticate, visit: https://login.tailscale.com/a/...`) untuk memastikan benar-benar kamu yang sedang duduk di depan laptop.
- `"src": ["autogroup:admin"]`: Hanya pengguna berstatus Admin/Owner di tailnet yang boleh memulai sesi SSH ini.
- `"dst": ["tag:web", "tag:db"]`: Berlaku saat menuju server bertag `tag:web` atau `tag:db`.
- `"users": ["autogroup:nonroot", "root"]`: Mengizinkan login ke akun Linux biasa mana pun (`autogroup:nonroot`, seperti `ahmad` atau `ubuntu`) maupun `root` jika memang dibutuhkan. *(Kalau untuk penggunaan harian cukup user biasa dengan `sudo`, menghapus `"root"` dari daftar ini membuatnya lebih aman lagi!)*

### Bagaimana Cara Kerja `checkPeriod` dan Batasan Paketnya?

- Secara bawaan, verifikasi ulang di mode `"check"` berlaku selama **12 jam** (`12h`). Setelah 12 jam, percobaan SSH baru akan meminta verifikasi browser sekali lagi.
- Kamu bisa menambahkan parameter `"checkPeriod": "1h"` (rentang valid `1m` hingga `168h` atau `"always"` tergantung dukungan). **Catatan penting:** menyesuaikan angka `checkPeriod` kustom di luar bawaan memerlukan paket berbayar (**Premium / Enterprise**); di paket **Free / Personal**, Check Mode tetap bisa dipakai sepenuhnya menggunakan durasi bawaan **12 jam**.
- Jika ada dua aturan yang beririsan—satu memakai `"accept"` dan satu memakai `"check"`—aturan **`"check"` selalu menang** (*takes precedence*).

---

## Langkah 3: Menguji Tailscale SSH & Check Mode dari Laptop

Dari laptopmu yang sudah masuk ke tailnet, coba jalankan:

```bash
ssh user_kamu@nama-server-kamu
```

*(Gunakan nama host MagicDNS server atau IP Tailscale-nya. Lihat kembali [cara memakai MagicDNS](/posts/tailscale-magicdns/) kalau belum menyalakannya.)*

Karena memakai `"action": "check"`, terminal akan memunculkan tautan sekali klik. Buka tautan tersebut di browser, lakukan verifikasi, dan **seketika terminalmu langsung masuk ke server**—tanpa menanyakan password server ataupun mengelola file `~/.ssh/authorized_keys`!

---

## Kapan Tetap Pakai `"accept"` daripada `"check"`?

Fitur **Check Mode** bersifat interaktif karena menunggu klik manusia di browser. Artinya, **skrip otomatis** seperti deployment CI/CD, `rsync` terjadwal di cron, atau Ansible yang berjalan di background **akan gagal/macet menunggu klik** jika terkena aturan `"check"`.

Solusi yang rapi: pisahkan antara manusia dan mesin!

- Untuk **manusia (admin)** yang login ke server -> selalu pakai `"action": "check"`.
- Untuk **mesin otomasi** (misalnya runner bertag `tag:ci-deploy`) -> buat aturan `"action": "accept"` yang sangat sempit: hanya boleh login sebagai satu user khusus non-root (misal `deploy`), ke server target tertentu saja, dan bukan `root`!

---

## Haruskah Layanan OpenSSH (`sshd`) Dimatikan?

Pemula sering bertanya: *"Kalau sudah ada Tailscale SSH, apakah `openssh-server` boleh dimatikan atau dihapus saja?"*

Jawabannya tergantung kesiapan akses daruratmu:

1. **Opsi Aman untuk Pemula: Biarkan `sshd` aktif, tetapi ikat ke `127.0.0.1` saja.**  
   Dengan menyunting `/etc/ssh/sshd_config` (atau membuat file drop-in `/etc/ssh/sshd_config.d/99-local-only.conf`):
   ```ini
   ListenAddress 127.0.0.1
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   ```
   Lalu muat ulang (`sudo systemctl reload ssh`). Dengan cara ini, `sshd` tidak mendengarkan IP publik (`203.0.113.10`) maupun membuang sumber daya melayani scanner, namun tetap ada jika sewaktu-waktu kamu butuh terowongan lokal atau mengakses via konsol darurat. *(Jangan lupa panduan dasar di [hardening SSH key Debian](/posts/debian-ssh-key/) dan [Fail2ban](/posts/debian-fail2ban-ssh/) jika kamu masih mempertahankan akses OpenSSH dari luar.)*
2. **Opsi Minimalis: Nonaktifkan `sshd` (`sudo systemctl disable --now ssh`).**  
   Hanya lakukan ini kalau kamu sudah **benar-benar menguji** konsol darurat VNC/Serial di dashboard penyedia VPS dan yakin bisa login tanpa SSH sama sekali bila daemon `tailscaled` sedang bermasalah!

---

## Checklist Singkat Sebelum Lanjut

- [x] `sudo tailscale set --ssh` sudah aktif di server.
- [x] Blok `"ssh"` di Access controls sudah disetel memakai `"action": "check"` untuk akses admin.
- [x] Uji `ssh user@nama-server` sukses melewati layar konfirmasi Tailscale SSH.
- [x] Layanan `sshd` lama tidak lagi mendengarkan di IP publik (atau sudah tertutup rapat oleh UFW dari Bagian 3).

Sekarang, cara masuk ke setiap server jauh lebih praktis sekaligus lebih aman. Di **Bagian 5**, kita akan membahas bagaimana membatasi komunikasi **antar-server** agar jika satu web server kebobolan, penyerang tidak bisa melompat bebas ke server database atau laptop admin.

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. [Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key](/posts/tailscale-hardening-tag-authkey/)
3. [Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik](/posts/tailscale-hardening-firewall-port/)
4. **Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode** *(sedang dibaca)*
5. [Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock](/posts/tailscale-hardening-acl-grants/)
6. [Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve](/posts/tailscale-hardening-layanan-internal/)
7. [Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat](/posts/tailscale-hardening-audit-pemulihan/)

---

## Referensi

- [Tailscale Docs: Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh)
- [Tailscale Docs: Tailnet policy file syntax](https://tailscale.com/docs/reference/syntax/policy-file)
- [Debian Manpage: `sshd_config(5)`](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)
