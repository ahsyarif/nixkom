---
title: Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik
date: 2026-11-14T10:02:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - ufw
  - firewall
  - docker
  - keamanan
description: Langkah menutup port SSH 22 dan port manajemen dari internet publik memakai UFW, mengizinkan akses hanya lewat interface tailscale0, serta menghindari jebakan Docker yang menembus firewall.
---

Di bagian sebelumnya, server Linux-mu sudah masuk ke jaringan privat Tailscale menggunakan identitas `tag:`. Namun sampai tahap ini, port `22` (SSH) dan mungkin port lain masih **terbuka lebar ke seluruh internet publik**.

Sekarang kita akan menerapkan prinsip **"Zero Open Management Ports"**: tidak ada satu pun port administrasi (SSH, panel admin, metrik, database) yang bisa dilihat atau disentuh oleh publik.

> Jika kamu belum akrab dengan perintah dasar UFW, baca dulu pengenalannya di [panduan firewall UFW di Debian](/posts/debian-firewall-ufw/) dan cara membaca daftar port di [cara cek port terbuka dengan `ss`](/posts/debian-cek-port/).

---

## Jangan Terburu-buru: Siapkan 2 Pengaman Ini Dulu!

Menutup port SSH publik sambil masih berada di sesi SSH publik berisiko membuatmu terkunci di luar server kalau ada salah ketik. Lakukan **dua pemeriksaan** ini terlebih dahulu:

1. **Uji koneksi lewat IP Tailscale dari laptopmu**  
   Ambil IP Tailscale server dari perintah `tailscale ip -4` (misalnya `100.101.102.20`), lalu buka terminal baru di laptop dan uji login SSH memakai IP `100.x.y.z` tersebut:
   ```bash
   ssh user_kamu@100.101.102.20
   ```
   Pastikan kamu berhasil masuk melalui IP `100.x.y.z`, bukan IP publik! *(Untuk langkah detail SSH lewat IP Tailscale, lihat juga [artikel akses SSH lewat Tailscale](/posts/tailscale-ssh-debian/).)*
2. **Pastikan Konsol Darurat VPS (VNC / Serial Console) Bisa Dibuka**  
   Buka dashboard penyedia VPS-mu dan pastikan fitur **Web Console / VNC** berfungsi serta kamu tahu username + password user `sudo` lokal.

---

## Langkah 1: Konfigurasi Dasar UFW & Izinkan `tailscale0`

Pastikan UFW terpasang di Debian/Ubuntu:

```bash
sudo apt update && sudo apt install -y ufw
```

Sekarang terapkan aturan dasar: tolak semua koneksi masuk secara bawaan, izinkan koneksi keluar, lalu buka pintu khusus untuk antarmuka jaringan virtual **`tailscale0`**:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
```

Apa arti baris ketiga (`sudo ufw allow in on tailscale0`)?

- **Analogi satpam gedung:** Semua paket yang datang dari kartu jaringan publik (`eth0` / internet luar) ditolak. Hanya paket yang sudah lolos terowongan terenkripsi WireGuard lewat antarmuka `tailscale0` yang diizinkan masuk ke layanan di server ini.
- Bagaimana jika kamu ingin lebih ketat lagi—misalnya di dalam tailnet pun server ini cuma boleh menerima port `22` dan `3000`? Kamu bisa menggantinya dengan aturan per port:
  ```bash
  sudo ufw allow in on tailscale0 to any port 22 proto tcp
  sudo ufw allow in on tailscale0 to any port 3000 proto tcp
  ```
  Kelebihannya, aturan UFW di host bekerja berpasangan dengan **Grants** Tailscale (yang akan kita bahas di Bagian 5). Jadi keamanan tidak bertumpu pada satu lapisan saja.

---

## Langkah 2: Port Publik Web & Port Opsional WireGuard (`41641/udp`)

Sesuaikan dua poin ini dengan peran servermu:

1. **Jika server ini adalah web server publik** (nginx/Caddy melayani pengunjung umum):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
   Jika server ini hanya untuk **database, worker, atau server internal**, **jangan buka port 80/443 maupun port apa pun** ke publik!
2. **Port `41641/udp` untuk koneksi langsung WireGuard (opsional):**  
   Tailscale bisa menembus NAT tanpa harus membuka port masuk apa pun (karena ia memulai koneksi keluar ke relay DERP/koordinasi). Namun, membuka port `41641/udp` ke publik membantu perangkat lain melakukan koneksi langsung (*direct peer-to-peer*) tanpa memantul lewat relay sehingga latensi lebih rendah:
   ```bash
   sudo ufw allow 41641/udp
   ```
   Tidak ada layanan login/shell di port `41641/udp`—hanya paket terenkripsi WireGuard yang ditolak otomatis jika kuncinya tidak cocok. Tetap aman!

---

## Langkah 3: Aktifkan UFW, Uji Lewat Tailscale, Baru Tutup SSH Publik

Jika sebelumnya SSH publik belum diizinkan di UFW dan kamu sudah aktifkan `ufw enable`, aturan lama mungkin sudah memblokir port `22` publik. Untuk berjaga-jaga selama transisi yang halus:

1. Pastikan aturan UFW saat ini terlihat rapi sebelum menghapus akses lama:
   ```bash
   sudo ufw enable
   sudo ufw status numbered
   ```
2. **Buka terminal baru di laptopmu** dan coba masuk SSH memakai **IP Tailscale (`100.101.102.20`)**. Jangan tutup sesi lama sebelum sesi baru ini sukses!
3. Setelah yakin bisa masuk lewat `100.101.102.20`, periksa apakah masih ada rule publik untuk port `22` atau `OpenSSH` di `sudo ufw status numbered`:
   ```text
   Status: active

        To                         Action      From
        --                         ------      ----
   [ 1] 22/tcp                     ALLOW IN    Anywhere
   [ 2] Anywhere on tailscale0     ALLOW IN    Anywhere
   [ 3] 80/tcp                     ALLOW IN    Anywhere
   [ 4] 443/tcp                    ALLOW IN    Anywhere
   ```
4. Hapus aturan nomor `[ 1 ]` (`22/tcp` atau `OpenSSH`) tersebut:
   ```bash
   sudo ufw delete 1
   ```
5. Sekali lagi, **buka terminal baru di laptopmu** dan lakukan dua tes kontras:
   - SSH ke **IP publik** (`ssh user@203.0.113.10`) -> harus **diam / timeout** (diblokir!).
   - SSH ke **IP Tailscale** (`ssh user@100.101.102.20`) -> harus **langsung berhasil masuk**!

Jangan lupa periksa juga **Cloud Firewall** di penyedia VPS (seperti AWS Security Group, DigitalOcean Cloud Firewall, atau Hetzner Firewall) jika kamu menggunakannya: tutup juga port `22` dari `0.0.0.0/0` di panel cloud agar lapisan paling luar pun ikut memblokirnya sebelum menyentuh OS Linux.

---

## Jebakan Kritis: Docker Bisa Menembus Firewall UFW!

Ini masalah paling sering menimpa pemula Linux modern. Banyak orang sudah yakin UFW aktif dan `default deny incoming`, lalu menjalankan kontainer Docker seperti ini:

```bash
# BERBAHAYA! Port 8080 tetap tembus ke internet publik meski UFW menyala!
docker run -d -p 8080:80 nginx
```

**Mengapa bisa tembus?**  
Karena Docker menulis aturan jaringan langsung ke rantai `DOCKER` di `iptables` / `nftables` **sebelum** paket tersebut sempat diperiksa oleh aturan UFW (`ufw-user-input`). Akibatnya, siapa pun di internet bisa membuka `http://203.0.113.10:8080` padahal `ufw status` sama sekali tidak menyebut port `8080`!

### Solusi Paling Bersih & Aman untuk Pemula

Selalu ikat (*bind*) port kontainer ke **loopback (`127.0.0.1`)**—lalu ekspos lewat reverse proxy atau `tailscale serve`—**atau** ikat langsung ke **IP Tailscale** server jika perlu diakses antar-node:

```bash
# Aman: hanya bisa diakses dari dalam server itu sendiri (localhost)
docker run -d -p 127.0.0.1:8080:80 nginx
```

Di `docker-compose.yml`, biasakan menulis lengkap seperti ini:

```yaml
services:
  grafana:
    image: grafana/grafana
    ports:
      - "127.0.0.1:3000:3000"
```

Jangan pernah hanya menulis `- "3000:3000"` untuk dashboard admin atau database karena Docker otomatis mengikatnya ke `0.0.0.0:3000` (semua interface, termasuk internet publik)!

---

## Audit Hasil: Pastikan Tidak Ada Port Bocor

Jalankan pengecekan dua arah untuk membuktikan firewall benar-benar bekerja:

1. **Dari dalam server**, periksa socket yang sedang mendengarkan:
   ```bash
   sudo ss -lntup
   ```
   Pastikan tidak ada layanan internal (database, Redis, admin Docker) yang mendengarkan di `0.0.0.0` atau `[::]` tanpa blokir firewall.
2. **Dari komputer luar (matikan dulu Tailscale sementara atau uji dari server lain di luar tailnet)**, jalankan pemindaian port cepat terhadap **IP publik**:
   ```bash
   nmap -Pn -p 22,80,443,3000,5432,8080 203.0.113.10
   ```
   Hasil yang sehat untuk server web: hanya `80/tcp` dan `443/tcp` yang berstatus `open`, sedangkan `22`, `3000`, `5432`, dan `8080` harus `filtered` (tidak merespons sama sekali)!

*(Catatan kecil: jika server kamu sekaligus berfungsi sebagai [subnet router](/posts/tailscale-subnet-router/) atau [exit node](/posts/tailscale-exit-node/), kamu juga perlu mengizinkan forwarding di UFW `DEFAULT_FORWARD_POLICY="ACCEPT"` atau rule `ufw route allow in on tailscale0 out on eth0`. Untuk server aplikasi biasa, tidak perlu diubah.)*

---

## Checklist Singkat Sebelum Lanjut

- [x] `sudo ufw status` menunjukkan `default deny incoming` dan hanya `tailscale0` (plus `80`/`443` jika web server) yang terbuka.
- [x] Uji koneksi SSH ke IP publik gagal/timeout, sementara SSH ke IP Tailscale berhasil.
- [x] Semua kontainer Docker memakai binding `127.0.0.1:PORT:PORT` kecuali memang sengaja dipublikasikan.
- [x] Pemindaian `nmap` ke IP publik tidak memperlihatkan port administrasi terbuka.

Sekarang server Linux-mu sudah menghilang dari radar pemindai port publik. Di **Bagian 4**, kita akan menyederhanakan sekaligus memperkuat cara login SSH memakai **Tailscale SSH & Check Mode** agar kamu tidak perlu repot mengelola file `authorized_keys` secara manual di banyak server.

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. [Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key](/posts/tailscale-hardening-tag-authkey/)
3. **Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik** *(sedang dibaca)*
4. [Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode](/posts/tailscale-hardening-tailscale-ssh/)
5. [Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock](/posts/tailscale-hardening-acl-grants/)
6. [Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve](/posts/tailscale-hardening-layanan-internal/)
7. [Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat](/posts/tailscale-hardening-audit-pemulihan/)

---

## Referensi

- [Tailscale Docs: Secure an Ubuntu/Linux server with UFW](https://tailscale.com/docs/how-to/secure-ubuntu-server-with-ufw)
- [Docker Docs: Packet filtering and firewalls (Docker & UFW)](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
- [Debian Manpage: `ufw(8)`](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)
- [Debian Manpage: `ss(8)`](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
- [Debian Manpage: `nmap(1)`](https://manpages.debian.org/trixie/nmap/nmap.1.en.html)
