---
title: "Disk Penuh (No space left on device): Bersihkan Aman Tanpa Merusak Sistem"
date: 2026-11-14T16:36:00+07:00
categories:
  - Linux
  - Server
  - DevOps
tags:
  - linux
  - disk
  - docker
  - logs
  - troubleshooting
  - pemula
description: "Cara mengatasi error No space left on device di server Linux dengan aman: melacak folder besar, membersihkan cache apt/journal/Docker tanpa menghapus volume, mengatasi inode 100%, dan truncate file log aktif."
---

Ketika disk server Linux mencapai **100% penuh**, efek dominonya langsung terasa: database berhenti menerima transaksi baru, Docker gagal menarik image, sesi login SSH bahkan bisa error karena tidak mampu membuat file sementara, dan `apt upgrade` gagal di tengah jalan.

Jangan langsung asal `rm -rf` folder acak di `/var` atau `/usr`! Di bagian kedua ini kita bahas 4 penyebab disk penuh beserta langkah pembersihan yang **aman** bagi sistem produksi.

---

## Langkah 1: Pastikan Masalahnya Ruang Disk (`df -h`) atau Inode (`df -i`)

Jalankan dua perintah ini sekaligus:

```bash
df -h
df -i
```

- Jika kolom **`Use%`** di `df -h` menunjukkan `99%` atau `100%` pada `/`, berarti **kapasitas ruang (GB)** benar-benar penuh.
- Jika `df -h` masih menyisakan banyak ruang kosong (misalnya baru terpakai `45%`), tetapi **`df -i`** menunjukkan **`IUse% = 100%`**, berarti **jumlah file (inode)** sudah habis! Biasanya disebabkan jutaan file kecil di `/tmp`, folder cache aplikasi, atau spool email/session yang lupa dibersihkan.

---

## Langkah 2: Temukan Folder Terbesar dengan Cepat

Lacak secara bertahap mulai dari `/` memakai flag `-x` (supaya tidak memindai `/proc` atau `/sys`):

```bash
sudo du -xh --max-depth=1 / | sort -h
```

Masuk terus ke folder paling gemuk yang tampil di baris bawah (misalnya `/var`, lalu `/var/log` atau `/var/lib/docker`). *(Penjelasan lengkap teknik investigasi ini ada di [artikel cek kesehatan CPU, RAM, & disk](/posts/linux-cli-pantau-cpu-ram-disk/).)*

Jika pelakunya adalah **jutaan file kecil (inode 100%)**, cari sub-folder dengan jumlah file terbanyak di dalam `/var` atau `/tmp` memakai:

```bash
sudo find /var -xdev -type f | cut -d "/" -f 1-4 | sort | uniq -c | sort -nr | head -n 10
```

---

## Langkah 3: Bersihkan 4 Sumber Sampah Terbesar dengan Aman

Setelah tahu lokasi pembengkakannya, bersihkan hanya area yang memang aman dibuang:

### 1. Cache paket `apt` lama (`/var/cache/apt/archives`)

```bash
sudo apt clean
```

Perintah ini menghapus file installer `.deb` lama yang sudah selesai dipasang—100% aman dan tidak memengaruhi aplikasi yang sedang berjalan.

### 2. Log `systemd` (`journald`) yang menumpuk berbulan-bulan

```bash
# Cek ukuran log saat ini
journalctl --disk-usage

# Putar log aktif lalu buang arsip yang lebih tua dari 7 hari
sudo journalctl --rotate
sudo journalctl --vacuum-time=7d
```

### 3. Sisa Image & Build Cache Docker (`/var/lib/docker`)

Jika servermu menjalankan Docker, sering kali puluhan gigabyte habis oleh image versi lama dan cache build:

```bash
# Intip rincian pemakaian ruang Docker terlebih dahulu
docker system df

# Hapus container mati, network tak terpakai, dan image tanpa label
docker system prune

# Untuk hasil lebih lega, hapus image lama yang tidak dipakai container aktif + build cache:
docker image prune -a
docker builder prune
```

> **PERINGATAN SANGAT PENTING:**  
> Jangan pernah menambahkan flag **`--volumes`** pada `docker system prune` di server produksi! Jika kebetulan container database sedang berhenti sebentar, `--volumes` bisa ikut menghapus **volume data database** selamanya!

### 4. File log raksasa yang masih aktif ditulis aplikasi

Pernahkah kamu menghapus file log `20 GB` dengan `sudo rm /var/log/app.log`, tetapi saat dicek `df -h` ruang disk-nya **tetap 100% penuh**? Itu karena aplikasi masih memegang *file descriptor*-nya! Cek dengan:

```bash
sudo lsof +L1
```

Lalu **restart layanan** yang memegang file `(deleted)` tersebut agar blok disk-nya dilepaskan.

**Trik admin profesional di kondisi darurat:** Untuk mengosongkan file log besar yang masih aktif ditulis **tanpa memutus proses** dan tanpa membuat space nyangkut, jangan pakai `rm`—gunakan **`truncate -s 0`**:

```bash
sudo truncate -s 0 /var/log/aplikasiku.log
```

Seketika itu juga ukuran file langsung menjadi `0 byte`, ruang disk langsung pulih, dan aplikasi tetap menulis baris baru dengan normal!

---

## Pencegahan Agar Tidak Penuh Lagi Bulan Depan

1. **Aktifkan `logrotate` untuk log aplikasi kustom** (di `/etc/logrotate.d/aplikasiku`) agar file log diputar mingguan/harian, dikompresi (`.gz`), dan dibatasi jumlah arsipnya.
2. **Batasi ukuran log container Docker** di `/etc/docker/daemon.json` supaya satu container error yang mencetak log terus-menerus tidak memenuhi disk VPS:
   ```json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "20m",
       "max-file": "3"
     }
   }
   ```
   *(Setelah menyunting `/etc/docker/daemon.json`, jalankan `sudo systemctl reload docker` atau `restart` saat jadwal maintenance.)*
3. **Atur batas permanen `journald`** di `/etc/systemd/journald.conf` dengan menetapkan `SystemMaxUse=500M` lalu `sudo systemctl restart systemd-journald`.

---

## Checklist Singkat Sebelum Lanjut

- [x] Sudah mengecek baik **`df -h`** (kapasitas) maupun **`df -i`** (inode).
- [x] Sudah membersihkan aman `apt clean`, `journalctl --vacuum-time`, dan `docker image prune` (**tanpa** `--volumes`).
- [x] Paham memakai `sudo truncate -s 0` untuk file log aktif dan `sudo lsof +L1` untuk file `(deleted)` yang masih menahan disk.

Di **Bagian 3**, kita akan menginvestigasi misteri ketika sebuah aplikasi atau database tiba-tiba mati sendiri tanpa pesan error di log aplikasi: **RAM habis dan ulah Linux OOM Killer**, lengkap dengan cara menambah **Swap file** secara aman di VPS kecil!

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. [Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri](/posts/troubleshoot-ssh-tidak-bisa-login/)
2. **Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem** *(sedang dibaca)*
3. [Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap](/posts/troubleshoot-ram-habis-oom-killer/)
4. [Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)](/posts/troubleshoot-web-502-504-port-bentrok/)
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. [Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied](/posts/troubleshoot-service-gagal-start-permission/)
7. [Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng](/posts/troubleshoot-ssl-dns-jam-server/)

---

## Referensi

- [Debian Manpage: `df(1)`](https://manpages.debian.org/trixie/coreutils/df.1.en.html)
- [Debian Manpage: `truncate(1)`](https://manpages.debian.org/trixie/coreutils/truncate.1.en.html)
- [Debian Manpage: `lsof(8)`](https://manpages.debian.org/trixie/lsof/lsof.8.en.html)
- [Debian Manpage: `journalctl(1)`](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)
