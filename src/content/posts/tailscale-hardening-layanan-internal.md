---
title: Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve
date: 2026-11-14T10:05:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - serve
  - database
  - keamanan
  - docker
description: Cara menutup akses internet ke PostgreSQL, Redis, Grafana, dan panel admin dengan mengikatnya ke 127.0.0.1 lalu mengeksposnya secara aman memakai Tailscale Serve dan Grants.
---

Sebagian besar kebocoran data pada server pemula bukan terjadi karena peretas memecahkan enkripsi canggih, melainkan karena hal sepele: **memasang database atau dashboard admin (PostgreSQL, Redis, Portainer, Grafana, pgAdmin, atau n8n) lalu membiarkannya terbuka di `0.0.0.0`**.

Meskipun di **Bagian 3** kita sudah mengunci firewall dengan UFW, prinsip pertahanan berlapis (*defense in depth*) mengajarkan satu aturan emas: **jangan hanya bergantung pada firewall—ikat juga aplikasinya supaya secara bawaan tidak pernah mendengarkan trafik dari internet publik!**

---

## Dua Pola Emas untuk Layanan Internal Server Linux

Tidak semua layanan internal butuh cara akses yang sama. Bagi layananmu menjadi dua kelompok ini:

1. **Database & servis TCP non-web** (PostgreSQL `5432`, MySQL `3306`, Redis `6379`) -> gunakan **loopback `127.0.0.1`** (jika satu server) atau **jalur `tailscale0` + `grants`** (jika beda server).
2. **Dashboard admin berbasis web** (Grafana `3000`, Portainer `9000`, Uptime Kuma `3001`) -> ikat ke **`127.0.0.1`** lalu bungkus dengan **`tailscale serve`** supaya mendapat **HTTPS privat otomatis**.

Mari praktikkan keduanya dengan rapi!

---

## Pola 1: Mengamankan Database (Satu Server vs Beda Server)

### Skenario A: Aplikasi dan Database Berada di Server yang Sama

Jika backend Node.js/Laravel/Python dan PostgreSQL berada di VPS yang sama, database **tidak perlu** bisa dihubungi dari jaringan luar mana pun, bahkan dari Tailscale sekalipun!

Ikat (*listen*) database secara eksplisit ke `127.0.0.1` (`localhost`):

- **PostgreSQL** (`/etc/postgresql/*/main/postgresql.conf`):
  ```ini
  listen_addresses = '127.0.0.1'
  ```
- **Redis** (`/etc/redis/redis.conf`):
  ```ini
  bind 127.0.0.1 ::1
  ```
- **Docker Compose:**
  ```yaml
  services:
    postgres:
      image: postgres:16
      ports:
        - "127.0.0.1:5432:5432"
  ```

Setelah restart service, aplikasi di server yang sama tetap terhubung ke `127.0.0.1:5432`, sementara dari luar mesin port tersebut **tidak eksis sama sekali**. Bagaimana kalau kamu di laptop butuh membuka isi database pakai DBeaver atau TablePlus? Cukup lakukan SSH port forwarding lewat Tailscale (`ssh -L 5432:127.0.0.1:5432 user@nama-server`)—aman tanpa membuka port database di jaringan!

### Skenario B: Server Aplikasi (`tag:web`) dan Database (`tag:db`) Terpisah

Jika aplikasi dan database berada di dua VPS berbeda, server web memang harus menghubungi IP Tailscale server database (misalnya `100.101.102.30:5432`).

Di server database (`tag:db`), terapkan **tiga lapisan kunci** bersamaan:

1. **Lapisan Firewall (UFW):** Hanya terima port `5432` dari `tailscale0`, tolak total dari internet publik (`sudo ufw allow in on tailscale0 to any port 5432 proto tcp`).
2. **Lapisan Tailnet (`grants` dari Bagian 5):** Hanya izinkan `tag:web` menghubungi `tag:db` pada `tcp:5432`.
3. **Lapisan Aplikasi (PostgreSQL):** Jangan hapus autentikasi password/scram-sha-256 dan aktifkan SSL jika perlu—jangan pernah set `trust` tanpa password di `pg_hba.conf`!

> **Catatan teknis penting saat booting Linux (`systemd`):**  
> Sebagian admin langsung menulis IP Tailscale spesifik (`listen_addresses = '127.0.0.1,100.101.102.30'`) di konfigurasi PostgreSQL. Hati-hati: saat VPS baru *reboot*, layanan database kadang menyala beberapa detik **sebelum** daemon `tailscaled` selesai membuat interface `tailscale0`, sehingga database gagal start!  
> Cara mencegahnya ada dua:
> - **Opsi termudah:** biarkan PostgreSQL listen ke `localhost,IP_TAILSCALE` hanya jika kamu menambahkan drop-in systemd (`sudo systemctl edit postgresql`) berisi `[Unit]` dengan `After=tailscaled.service` dan `Wants=tailscaled.service`; **atau**
> - Biarkan listen terbatas lewat aturan ketat `pg_hba.conf` (`host all all 100.64.0.0/10 scram-sha-256`) + firewall UFW yang hanya membuka `5432` pada `tailscale0`. (Peringatan: jika memakai Docker untuk database lintas server, selalu gunakan aturan UFW/iptables `DOCKER-USER` atau ikat langsung ke `-p 100.101.102.30:5432:5432` agar tidak bocor ke internet publik!)

---

## Pola 2: Membungkus Dashboard Admin Web dengan `Tailscale Serve`

Misalnya di server kamu memasang **Grafana** di `127.0.0.1:3000` atau **Uptime Kuma** di `127.0.0.1:3001`. Kalau membukanya langsung via IP HTTP biasa, browser memunculkan peringatan *"Not Secure"*, dan kamu harus mengingat nomor port yang bermacam-macam.

Dengan **Tailscale Serve**, daemon Tailscale bertindak sebagai **reverse proxy HTTPS privat** dengan sertifikat SSL resmi otomatis—tetapi **hanya bisa diakses oleh perangkat di dalam tailnetmu**!

> Sebelum menjalankan langkah ini, pastikan **MagicDNS** dan **HTTPS Certificates** sudah diaktifkan di tab **DNS** pada Tailscale Admin Console. (Kamu bisa menyegarkan pemahaman soal MagicDNS & Serve di [artikel MagicDNS](/posts/tailscale-magicdns/) dan [pengenalan Serve vs Funnel](/posts/tailscale-serve-funnel/).)

### Langkah Menjalankan `Tailscale Serve` dengan Aman

1. Pastikan aplikasi dashboard hanya berjalan di loopback (`127.0.0.1:3000`), bukan `0.0.0.0:3000`.
2. Jalankan `tailscale serve` di background dengan flag `--bg`:
   ```bash
   sudo tailscale serve --bg http://127.0.0.1:3000
   ```
   *(Menulis target `3000` saja juga otomatis dipetakan ke `http://127.0.0.1:3000`, namun menulis lengkap `http://127.0.0.1:3000` membuat niat konfigurasi lebih jelas dibaca.)*
3. Periksa status konfigurasi Serve yang aktif:
   ```bash
   tailscale serve status
   ```
   Kamu akan melihat alamat HTTPS privat seperti `https://web-prod.tailnet-abc.ts.net` yang meneruskan lalu lintas secara aman ke `http://127.0.0.1:3000` di dalam server.

### Keuntungan Keamanan Gabungan `Serve` + `Grants`

- Alamat `https://web-prod.tailnet-abc.ts.net` **tidak bisa dibuka dari internet umum**—orang luar yang mencoba membukanya tidak akan tersambung ke aplikasi internalmu.
- Koneksi dari browser laptopmu ke server terenkripsi ganda oleh terowongan WireGuard + TLS HTTPS yang valid (tidak ada peringatan sertifikat berbahaya).
- Karena `tailscale serve` berjalan lewat jalur Tailscale port `443`, akses ke dashboard ini juga **otomatis mengikuti aturan `grants` dari Bagian 5**: hanya `autogroup:admin` yang diizinkan mengakses `tag:web` di port `tcp:443`!

### Bagaimana Cara Mematikan atau Mereset `Tailscale Serve`?

Jika ingin menghentikan layanan Serve yang berjalan di background:

```bash
# Mematikan seluruh aturan serve di server ini
sudo tailscale serve reset
```

Atau untuk mematikan rute tertentu saja, tambahkan `off` dengan flag yang sama saat menyalakannya (misalnya `sudo tailscale serve --https=443 off`).

---

## PERINGATAN KERAS: Jangan Pernah Salah Pakai `tailscale funnel` untuk Panel Admin!

Perintah `tailscale serve` dan `tailscale funnel` terlihat mirip, tetapi **tujuannya berlawanan 180 derajat**:

- **`tailscale serve`**: **PRIVAT**, hanya bisa diakses oleh anggota dan perangkat di dalam tailnetmu sendiri. Ini yang dipakai untuk dashboard admin internal!
- **`tailscale funnel`**: **PUBLIK KE SELURUH INTERNET**, membuat layanan lokalmu bisa dibuka siapa saja di dunia tanpa akun Tailscale!

Jangan pernah menjalankan `tailscale funnel` untuk pgAdmin, Portainer, PhpMyAdmin, Grafana tanpa proteksi tambahan, atau panel internal—karena satu perintah itu langsung membuka pintu ruang mesinmu ke seluruh internet!

---

## Audit Hasil: Pastikan `ss -lntup` Bersih

Jalankan kembali perintah inspeksi socket di server:

```bash
sudo ss -lntup
```

Ciri server yang sudah bersih:

- PostgreSQL (`5432`), Redis (`6379`), Grafana (`3000`), Portainer (`9000`) **hanya muncul** di `127.0.0.1:<PORT>` (atau khusus IP `100.x.y.z` jika database lintas server).
- Tidak ada port admin atau database yang mendengarkan di `0.0.0.0` / `*:<PORT>` tanpa tameng firewall.

---

## Checklist Singkat Sebelum Lanjut

- [x] Database satu-server diikat ke `127.0.0.1`, bukan `0.0.0.0`.
- [x] Database lintas-server terlindungi oleh 3 lapis: UFW (`tailscale0`), Tailscale `grants` (`tag:web` -> `tag:db`), dan autentikasi database sendiri.
- [x] Dashboard web internal diikat ke `127.0.0.1` dan diekspos aman ke tailnet lewat `sudo tailscale serve --bg`.
- [x] Tidak memakai `tailscale funnel` untuk panel internal.

Semua lapis akses dan layanan kini sudah terpasang rapi. Di **Bagian 7** (artikel penutup seri ini), kita akan membahas cara memantau log keamanan Tailscale, prosedur darurat saat laptop hilang atau key bocor, serta menyiapkan jalur **Break-Glass** agar kamu tidak pernah terkunci selamanya dari servermu sendiri.

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. [Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key](/posts/tailscale-hardening-tag-authkey/)
3. [Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik](/posts/tailscale-hardening-firewall-port/)
4. [Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode](/posts/tailscale-hardening-tailscale-ssh/)
5. [Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock](/posts/tailscale-hardening-acl-grants/)
6. **Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve** *(sedang dibaca)*
7. [Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat](/posts/tailscale-hardening-audit-pemulihan/)

---

## Referensi

- [Tailscale Docs: Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Tailscale CLI Reference: `tailscale serve`](https://tailscale.com/docs/reference/tailscale-cli/serve)
- [Tailscale Docs: MagicDNS](https://tailscale.com/docs/features/magicdns)
- [Debian Manpage: `ss(8)`](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
