---
title: "Kelola service dengan systemctl, lacak error di journalctl"
date: 2026-11-14T12:23:00+07:00
categories:
  - Linux
  - DevOps
  - Server
tags:
  - linux
  - systemd
  - systemctl
  - journalctl
  - troubleshooting
  - pemula
description: Panduan praktis mengontrol layanan server Linux dengan systemctl (start, enable, reload vs restart, drop-in edit) dan melacak error cepat memakai journalctl.
---

Di distro Linux modern seperti Debian, Ubuntu, Fedora, maupun Rocky Linux, hampir seluruh layanan penting—mulai dari Nginx, PostgreSQL, Docker, hingga Tailscale—dijalankan dan diawasi di latar belakang oleh **`systemd`**.

Dua alat komando yang wajib kamu kuasai adalah **`systemctl`** (untuk menyalakan, mematikan, dan mengatur layanan) dan **`journalctl`** (untuk membaca log error secara rapi saat ada layanan yang mogok).

---

## Bagian 1: Perintah Wajib `systemctl` yang Harus Dibedakan

Pemula sering tertukar antara `start` vs `enable`, dan antara `restart` vs `reload`. Mari kita luruskan keduanya!

### 1. Memeriksa Status & Mencari Layanan yang Gagal

```bash
# Cek kondisi detail satu service beserta beberapa baris log terakhir
sudo systemctl status nginx

# Lihat daftar semua service yang sedang gagal/crash saat ini!
systemctl --failed

# Lihat semua service yang aktif berjalan
systemctl list-units --type=service --state=running
```

Di output `systemctl status`, perhatikan dua kata di baris `Loaded:` dan `Active:`:
- **`active (running)`** = service sedang hidup sekarang.
- **`enabled`** = service akan otomatis nyala lagi ketika VPS reboot (sebaliknya `disabled` berarti tidak otomatis jalan saat boot).

### 2. Beda `start` / `stop` vs `enable` / `disable`

| Perintah | Efek Saat Ini | Efek Saat VPS Reboot |
| --- | --- | --- |
| `sudo systemctl start nginx` | Menyalakan sekarang | Tidak mengubah aturan boot |
| `sudo systemctl enable nginx` | **Belum** menyalakan sekarang | Otomatis menyala saat boot |
| **`sudo systemctl enable --now nginx`** | **Langsung menyalakan sekarang** | **Otomatis menyala saat boot** |
| `sudo systemctl disable --now nginx` | Langsung mematikan sekarang | Tidak akan menyala saat boot |

Gunakan `--now` supaya tidak perlu mengetik dua perintah terpisah (`enable` lalu `start`)!

### 3. Beda `reload` vs `restart` (Tips Zero-Downtime!)

- **`sudo systemctl restart nginx`:** Mematikan total proses lalu menyalakannya ulang. Koneksi pengunjung yang sedang berlangsung bisa terputus sesaat.
- **`sudo systemctl reload nginx`:** Menyuruh layanan membaca ulang file konfigurasi baru **tanpa mematikan proses** dan tanpa memutus koneksi aktif!

> **Kebiasaan emas:** Sebelum me-reload layanan kritis setelah mengedit file config, **selalu uji syntax konfigurasinya dulu**:
> ```bash
> sudo nginx -t && sudo systemctl reload nginx
> ```
> Dengan `&&`, jika `nginx -t` menemukan typo di config, `reload` dibatalkan dan website tidak jadi tumbang!

---

## Bagian 2: Jangan Edit File Unit Systemd Asli — Pakai `systemctl edit`

Kalau suatu saat kamu perlu menambah batas memori, variabel environment, atau mengatur urutan startup (misalnya menyuruh database menunggu `tailscaled`), **jangan menyunting file asli di `/lib/systemd/system/...`**. Saat `apt upgrade`, file di sana bisa tertimpa oleh paket baru!

Cara yang benar adalah membuat file *drop-in override*:

```bash
sudo systemctl edit postgresql
```

Perintah tersebut membuka editor untuk file aman di `/etc/systemd/system/postgresql.service.d/override.conf` (di bagian atas antara penanda komentar yang disediakan). Setelah disimpan, systemd otomatis menggabungkan tambahanmu tanpa merusak file bawaan paket. Jika pernah mengubah file secara manual, jalankan `sudo systemctl daemon-reload` agar systemd membaca ulang definisinya.

---

## Bagian 3: Melacak Akar Masalah dengan `journalctl`

Saat sebuah service gagal dijalankan dengan pesan singkat *"Job for app.service failed because the control process exited with error code"*, `systemctl status` sering kali memotong pesan errornya. Tempat membaca log lengkapnya adalah **`journalctl`**.

Berikut filter `journalctl` paling berguna sehari-hari:

```bash
# 1. Lihat 50 baris log terakhir milik satu service
sudo journalctl -u nginx -n 50 --no-pager

# 2. Pantau log service secara live saat menguji atau me-restart
sudo journalctl -u nginx -f

# 3. Lihat log dari rentang waktu tertentu saja (sangat cepat saat insiden!)
sudo journalctl -u postgresql --since "30 minutes ago"
sudo journalctl -u ssh --since "2026-11-14 08:00:00" --until "2026-11-14 09:00:00"

# 4. Lihat HANYA pesan error/kritis sejak server terakhir kali menyala (-b = current boot)
sudo journalctl -p err -b
```

*(Flag `--no-pager` membuat log langsung tercetak ke layar tanpa masuk mode gulir `less`, praktis jika kamu ingin menyalin pesan error-nya atau mengalirkannya dengan `| grep`.)*

---

## Trik Tambahan: Merapikan Ukuran Log `journald` Jika Mulai Memakan Disk

Saat investigasi disk penuh di **Bagian 3**, terkadang `/var/log/journal` ikut memakan beberapa gigabyte selama berbulan-bulan. Jangan hapus file di dalam `/var/log/journal` pakai `rm` secara paksa—pakai perintah bawaan `journalctl`:

```bash
# Cek berapa banyak ruang disk yang dipakai journald saat ini
journalctl --disk-usage

# Arsipkan log aktif lalu hapus arsip log yang lebih tua dari 14 hari
sudo journalctl --rotate
sudo journalctl --vacuum-time=14d

# Atau batasi total ukuran maksimal log (misal 500 MB)
sudo journalctl --vacuum-size=500M
```

---

## Checklist Singkat Sebelum Lanjut

- [x] Memahami beda `start` vs `enable`, serta memakai `enable --now`.
- [x] Mengutamakan `nginx -t && systemctl reload` daripada langsung `restart`.
- [x] Bisa mengecek service error dengan `systemctl --failed` dan `journalctl -u NAMA -n 50 --no-pager`.
- [x] Tahu cara memangkas ruang disk log `systemd` dengan `--vacuum-time` / `--vacuum-size`.

Di **Bagian 5**, kita akan menangani dua masalah jaringan dan proses paling sering terjadi di VPS: menghentikan proses bandel secara aman, memakai **`tmux`** agar tugas berat tidak mati saat SSH putus, serta menelusuri port dan DNS memakai `ss`, `ip`, `dig`, dan `curl`.

---

## Seri Tips & Trik Command Linux untuk Manajemen Server

1. [Bagian 1 — Trik Navigasi Terminal & Manajemen File Cepat di Server Linux](/posts/linux-cli-navigasi-file/)
2. [Bagian 2 — Membaca Config, Pipe, Redirection, & Trik Edit File di Server](/posts/linux-cli-teks-pipe-redirection/)
3. [Bagian 3 — Cek Kesehatan Server: Pantau CPU, RAM, & Disk Penuh dengan Cepat](/posts/linux-cli-pantau-cpu-ram-disk/)
4. **Bagian 4 — Mengelola Service dengan systemctl & Investigasi Error di journalctl** *(sedang dibaca)*
5. [Bagian 5 — Mengelola Proses Bandel, Port Terbuka, & Troubleshooting Jaringan](/posts/linux-cli-proses-jaringan-port/)
6. [Bagian 6 — Manajemen Paket, User, sudo, & Permission Tanpa Panik](/posts/linux-cli-paket-user-permission/)
7. [Bagian 7 — Menjalankan Tugas Otomatis (cron vs systemd timer) & Kebiasaan Aman](/posts/linux-cli-otomatis-cron-systemd-timer/)

---

## Referensi

- [Debian Manpage: `systemctl(1)`](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html)
- [Debian Manpage: `journalctl(1)`](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)
