---
title: "Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng"
date: 2026-11-14T16:41:00+07:00
categories:
  - Linux
  - Server
  - DevOps
  - Security
tags:
  - linux
  - ssl
  - dns
  - ntp
  - timedatectl
  - troubleshooting
  - pemula
description: "Cara mendiagnosis dan mengatasi error sertifikat SSL/HTTPS Let's Encrypt gagal terbit, DNS domain belum mengarah ke VPS, serta berbagai error aneh akibat jam sistem Linux melenceng."
---

Di bagian penutup seri troubleshooting ini, kita membahas tiga kendala yang sering terasa "gaib" bagi pemula: domain sudah dibeli tapi situs tidak terbuka dengan sertifikat HTTPS valid, Let's Encrypt gagal menerbitkan SSL, atau tiba-tiba muncul error token kedaluwarsa/signature invalid padahal kode tidak pernah disentuh.

Kabar baiknya, ketiga masalah itu bisa diuji langsung dari terminal Linux hanya dengan beberapa perintah sederhana!

---

## Masalah 1: Domain Tidak Mengarah atau Menuju Server Lama (DNS)

Setelah mengarahkan A record domain ke IP VPS baru (`203.0.113.10`), jangan mengandalkan browser karena browser dan ISP sering menyimpan cache DNS lama!

Uji langsung dari terminal menggunakan `dig` (atau `getent hosts`):

```bash
# Cek jawaban DNS publik (misal resolver Cloudflare 1.1.1.1)
dig +short @1.1.1.1 domainkamu.com A
dig +short @1.1.1.1 www.domainkamu.com A

# Cek bagaimana server lokal sendiri me-resolve domain tersebut
getent hosts domainkamu.com
```

Jika hasilnya masih menampilkan IP lama atau kosong:
1. Periksa panel DNS (Cloudflare, Namecheap, Niagahoster, dll.): pastikan A record mengarah ke IPv4 VPS yang benar, dan jika kamu mengaktifkan AAAA record (IPv6), pastikan VPS-mu benar-benar melayani aplikasi di IPv6 tersebut atau hapus dulu AAAA record kalau hanya memakai IPv4!
2. Jika memakai **Cloudflare Proxy (awan oranye)**: ingat bahwa `dig` akan menampilkan IP milik Cloudflare, bukan IP VPS-mu—itu normal ketika proxy aktif. Namun saat pertama kali menerbitkan sertifikat dengan `certbot --nginx` HTTP-01 atau men-debug error asal, matikan dulu sementara awan oranye (*DNS only* / awan abu-abu) sampai HTTPS di VPS terbukti beres!

---

## Masalah 2: Sertifikat SSL/HTTPS Gagal Terbit atau Muncul Peringatan Browser

### 1. Kenapa `certbot` atau Caddy gagal mendapat sertifikat Let's Encrypt?

Syarat utama verifikasi otomatis Let's Encrypt (HTTP-01) hanya tiga:
- **DNS sudah mengarah ke IP VPS** (`dig +short @1.1.1.1 domainkamu.com`).
- **Port `80` dan `443` terbuka di UFW dan Cloud Firewall!**  
  Ini penyebab #1 kegagalan Certbot/Caddy: banyak orang membuka `443/tcp`, tetapi **lupa membuka port `80/tcp`**! Padahal Let's Encrypt mengecek tantangan HTTP-01 lewat port `80` terlebih dahulu!
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  ```
- **Tidak terblokir Rate Limit:** Jika gagal berkali-kali dalam 1 jam (5 kegagalan pada domain yang sama), tunggu 1 jam sebelum mencoba lagi, atau gunakan flag `--dry-run` di `certbot` saat menguji konfigurasi!

### 2. Cek Isi Sertifikat HTTPS Langsung dari Terminal

Ingin tahu kapan sertifikat SSL domainmu kedaluwarsa atau apakah ia menyajikan sertifikat milik domain lain (`SSL_ERROR_BAD_CERT_DOMAIN`)? Jalankan satu baris `openssl` ini:

```bash
openssl s_client -connect domainkamu.com:443 -servername domainkamu.com </dev/null 2>/dev/null \
  | openssl x509 -noout -dates -issuer -subject
```

Outputnya langsung memperlihatkan:
- `subject=` (domain tujuan sertifikat — pastikan cocok dengan domainmu!)
- `issuer=` (misalnya `Let's Encrypt`)
- `notBefore` & `notAfter` (tanggal berlaku dan tanggal kedaluwarsa).

*(Dan ingat: selalu aktifkan auto-renew, lalu uji dengan `sudo certbot renew --dry-run`! Jika memakai Caddy, perpanjangan sudah otomatis tanpa cron tambahan.)*

---

## Masalah 3: Kendala "Gaib" Akibat Jam Server Melenceng (`timedatectl`)

Pernah mengalami salah satu dari keanehan ini?
- Login 2FA / TOTP / OAuth / JWT selalu ditolak (*"token expired"* padahal baru dibuat 1 detik lalu).
- Upload ke AWS S3 / Cloudflare R2 gagal dengan error `RequestTimeTooSkewed`.
- `apt update` menolak file repositori (*"Release file is not valid yet"*).
- Log aplikasi di `journalctl` dan dashboard monitoring tidak cocok waktunya.

Hampir pasti penyebabnya adalah **jam sistem di VPS tidak sinkron (NTP mati atau bergeser)**!

### Cara Cek & Memperbaikinya dengan `timedatectl`

```bash
timedatectl status
```

Perhatikan baris **`System clock synchronized:`** dan **`NTP service:`**:

- Jika tertulis `System clock synchronized: no`, segera aktifkan sinkronisasi waktu otomatis (NTP):
  ```bash
  sudo timedatectl set-ntp true
  ```
- **Zona waktu (`Time zone`):** Mayoritas admin server sengaja mempertahankan zona waktu server di **`UTC`** agar log di seluruh server lintas negara mudah dicocokkan dan tidak membingungkan *Daylight Saving Time*. Namun jika kamu mengelola satu VPS tunggal khusus tim lokal dan ingin log langsung terbaca WIB (`UTC+7`), kamu boleh menyetelnya:
  ```bash
  sudo timedatectl set-timezone Asia/Jakarta
  ```

Setelah mengaktifkan `set-ntp true`, cek ulang `timedatectl status` beberapa detik kemudian hingga `System clock synchronized: yes`!

---

## Penutup Seri: Peta Cepat Diagnosis Ketika Server Bermasalah

Simpan daftar ringkas ini sebagai langkah pertolongan pertama tiap kali server Linux mengalami gangguan:

1. **Tidak bisa SSH?** -> Cek pesan error (`refused` vs `timed out` vs `publickey`), cek `fail2ban-client` / `ufw` lewat Web Console VPS.
2. **Aplikasi/DB gagal menulis?** -> Cek `df -h` dan `df -i`, bersihkan cache aman (`apt clean`, `journalctl --vacuum-time`, `docker image prune`), pakai `truncate -s 0` atau `lsof +L1`.
3. **Proses mati mendadak tanpa log error?** -> Cek OOM Killer via `sudo journalctl -k | grep -i killed`, pasang Swap file & batasi memori.
4. **Website `502`/`504`?** -> Cek `curl -Iv http://127.0.0.1:PORT`, cek `ss -lntup`, baca `nginx/error.log`.
5. **`apt` error lock / terputus?** -> Cek `ps aux | grep -iE 'apt|dpkg|unattended'`, lanjutkan dengan `sudo dpkg --configure -a` + `sudo apt -f install`.
6. **Service gagal start / `403`?** -> Cek `journalctl -u NAMA -n 50 --no-pager`, `nginx -t`, dan telusuri izin folder dengan `namei -l`.
7. **SSL / DNS / token aneh?** -> Cek `dig +short @1.1.1.1`, pastikan port `80` & `443` terbuka, cek sertifikat via `openssl x509`, dan pastikan `timedatectl` sinkron (`NTP: active`).

Dengan menguasai tujuh skenario di seri ini, kamu sudah siap menghadapi sebagian besar kendala harian di server Linux produksi dengan tenang dan terstruktur!

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. [Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri](/posts/troubleshoot-ssh-tidak-bisa-login/)
2. [Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem](/posts/troubleshoot-disk-penuh-no-space/)
3. [Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap](/posts/troubleshoot-ram-habis-oom-killer/)
4. [Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)](/posts/troubleshoot-web-502-504-port-bentrok/)
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. [Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied](/posts/troubleshoot-service-gagal-start-permission/)
7. **Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng** *(sedang dibaca)*

---

## Referensi

- [Debian Manpage: `dig(1)`](https://manpages.debian.org/trixie/bind9-dnsutils/dig.1.en.html)
- [Debian Manpage: `openssl-x509(1ssl)`](https://manpages.debian.org/trixie/openssl/openssl-x509.1ssl.en.html)
- [Debian Manpage: `timedatectl(1)`](https://manpages.debian.org/trixie/systemd/timedatectl.1.en.html)
- [Debian Manpage: `ufw(8)`](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)
