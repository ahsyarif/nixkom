---
title: "Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied"
date: 2026-11-14T16:40:00+07:00
categories:
  - Linux
  - Server
  - Security
tags:
  - linux
  - systemd
  - nginx
  - permission
  - troubleshooting
  - pemula
description: "Cara melacak penyebab service systemd gagal start atau restart terus-menerus, serta menelusuri error 403 Forbidden dan Permission denied secara menyeluruh dengan journalctl dan namei -l."
---

Dua error ini hampir pasti ditemui setiap developer yang men-deploy aplikasi sendiri ke VPS Linux:

1. Saat menyalakan service (`sudo systemctl start nama-app`), langsung muncul pesan singkat **`Job for nama-app.service failed`**, atau service hidup sebentar lalu mati-nyala berulang (*restart loop*).
2. Nginx sudah berjalan dan mengarah ke folder web yang benar, tetapi browser tetap menampilkan **`403 Forbidden`** atau aplikasi menulis **`EACCES: permission denied`**.

Mari kita pelajari cara menemukan penyebab pastinya dalam hitungan detik—tanpa menebak-nebak dan tanpa jalan pintas berbahaya `chmod 777`!

---

## Bagian 1: Mengatasi Service `systemd` Gagal Start

Jangan hanya menatap pesan `"Job for ... failed"`. Langsung buka dua sumber utama kebenaran di Linux:

```bash
sudo systemctl status nama-service
sudo journalctl -u nama-service -n 50 --no-pager
```

*(Untuk panduan filter log lebih lengkap, baca juga [cara memakai `systemctl` & `journalctl`](/posts/linux-cli-service-systemd-log/).)*

Mayoritas kasus service gagal menyala jatuh ke salah satu dari **4 penyebab** ini:

### 1. Salah Syntax pada File Konfigurasi (Nginx / Caddy / SSH)

Sebelum menyalahkan sistem, uji konfigurasi dengan perintah bawaannya:

```bash
sudo nginx -t
# Atau untuk SSH: sudo sshd -t
```

Biasanya langsung muncul nama file beserta nomor baris yang kurang tanda titik-koma `;` atau kurung kurawal `}`.

### 2. Path di `ExecStart` Tidak Lengkap atau `.env` Tidak Terbaca

Di file unit `.service` systemd, perintah **tidak otomatis memakai `$PATH` terminal pribadimu** dan tidak otomatis membaca `.bashrc` / `nvm`!

- Selalu pakai path absolut penuh: misalnya `/usr/bin/node /opt/app/index.js`, bukan hanya `node index.js`!
- Pastikan `WorkingDirectory=/opt/app` dan `EnvironmentFile=/opt/app/.env` tertulis jelas jika aplikasimu membutuhkan variabel lingkungan.
- Setiap kali selesai mengubah file `.service`, selalu jalankan:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl restart nama-service
  ```

### 3. Port Sudah Dipakai Proses Lain (`EADDRINUSE`)

Jika `journalctl` menampilkan `Address already in use`, cek siapa yang menduduki port tersebut dengan `sudo ss -lntup | grep :PORT` (lihat pembahasan detailnya di [Bagian 4 seri ini](/posts/troubleshoot-web-502-504-port-bentrok/)).

### 4. Mencoba Mengikat IP VPN (`tailscale0`) Sebelum VPN Siap Saat Boot

Jika service seperti database gagal start *hanya saat VPS reboot* (tetapi sukses ketika dijalankan manual setelah login), besar kemungkinan ia mencoba mengikat alamat IP `100.x.y.z` sebelum `tailscaled` selesai aktif! Tambahkan drop-in override lewat `sudo systemctl edit nama-service`:

```ini
[Unit]
After=tailscaled.service
Wants=tailscaled.service
```

---

## Bagian 2: Mengatasi `403 Forbidden` & `Permission denied` dengan `namei -l`

Pemula sering bingung: *"Folder `/home/ahmad/web/dist` sudah ku-`chmod 755` dan `chown www-data`, kok Nginx masih menampilkan `403 Forbidden`?!"*

Alasannya hampir selalu karena **salah satu folder induk di atasnya** (seperti `/home/ahmad`) hanya memiliki izin `700` atau `750`! Dalam aturan Linux, user `www-data` **harus memiliki izin `x` (*execute/traverse*) di SETIAP folder induk sepanjang perjalanan dari `/` menuju folder tujuan**!

### Perintah Penyelamat: `namei -l`

Daripada mengecek `/`, `/home`, `/home/ahmad`, dan seterusnya satu per satu, jalankan satu perintah ini:

```bash
namei -l /home/ahmad/web/dist/index.html
```

Contoh output:

```text
f: /home/ahmad/web/dist/index.html
drwxr-xr-x root     root     /
drwxr-xr-x root     root     home
drwx------ ahmad    ahmad    ahmad       <-- BIANG KEROK! Izin cuma 700 milik ahmad!
drwxr-xr-x www-data www-data web
drwxr-xr-x www-data www-data dist
-rw-r--r-- www-data www-data index.html
```

Dalam **1 detik**, `namei -l` langsung menunjuk baris mana yang menghalangi jalan!

### Cara Perbaikan yang Benar & Aman

1. **Paling bersih:** Simpan file web produksi di `/var/www/...` atau `/srv/...`, **bukan** di dalam `/home/user/`! Jadi tidak perlu melonggarkan izin home directory pribadimu.
2. **Atur pemilik dan izin secara terpisah untuk folder & file:**
   ```bash
   sudo chown -R www-data:www-data /var/www/aplikasiku
   sudo find /var/www/aplikasiku -type d -exec chmod 755 {} +
   sudo find /var/www/aplikasiku -type f -exec chmod 644 {} +
   ```
   *(Pelajari lebih detail alasan keamanan mengapa `chmod 777` sangat berbahaya di [artikel permission Linux tanpa 777](/posts/debian-permission-tanpa-777/).)*
3. **Untuk error `403 Forbidden` di Nginx meski permission benar:** Cek apakah file `index.html` / `index.php` memang ada di folder `root` yang tertulis di blok `server { ... }` Nginx!

---

## Checklist Singkat Sebelum Lanjut

- [x] Selalu memeriksa `sudo journalctl -u NAMA -n 50 --no-pager` saat service gagal start.
- [x] Memastikan `ExecStart` memakai path absolut dan menjalankan `sudo systemctl daemon-reload` setelah edit unit file.
- [x] Memakai **`namei -l /path/lengkap/file`** untuk menemukan folder induk mana yang memblokir akses `www-data` / user aplikasi.

Di **Bagian 7** (penutup seri troubleshooting ini), kita akan membedah masalah klasik yang sering muncul saat peluncuran domain: **SSL/HTTPS error, DNS tidak kunjung mengarah, dan efek domino jam server yang melenceng (`timedatectl`)**!

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. [Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri](/posts/troubleshoot-ssh-tidak-bisa-login/)
2. [Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem](/posts/troubleshoot-disk-penuh-no-space/)
3. [Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap](/posts/troubleshoot-ram-habis-oom-killer/)
4. [Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)](/posts/troubleshoot-web-502-504-port-bentrok/)
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. **Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied** *(sedang dibaca)*
7. [Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng](/posts/troubleshoot-ssl-dns-jam-server/)

---

## Referensi

- [Debian Manpage: `systemctl(1)`](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html)
- [Debian Manpage: `journalctl(1)`](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)
- [Debian Manpage: `namei(1)`](https://manpages.debian.org/trixie/util-linux/namei.1.en.html)
- [Artikel Terkait: Permission file di Debian tanpa chmod 777](/posts/debian-permission-tanpa-777/)
