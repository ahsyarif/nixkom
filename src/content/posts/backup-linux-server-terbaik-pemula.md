---
title: "Backup server Linux untuk pemula: 3-2-1 dan uji restore"
date: 2026-11-14T16:30:00+07:00
categories:
  - Linux
  - Server
  - DevOps
  - Security
tags:
  - linux
  - backup
  - restic
  - vps
  - keamanan
  - pemula
  - postgresql
description: "Strategi backup server Linux untuk pemula: aturan 3-2-1, beda snapshot dan dump database, restic otomatis ke object storage, lalu uji restore."
---

Jika suatu hari VPS-mu mendadak tidak bisa diakses—entah karena salah menjalankan perintah `rm`, update yang merusak sistem, serangan ransomware, atau bahkan akun penyedia cloud terkena *suspend*—satu-satunya hal yang menentukan apakah proyekmu bisa selamat atau tamat adalah **backup**.

Masalahnya, banyak pemula merasa sudah aman hanya karena:
- Mengaktifkan fitur *auto-snapshot* mingguan dari panel VPS yang sama, **atau**
- Menjalankan `zip` / `tar` lalu menyimpannya di folder `/root/backup.tar.gz` pada disk VPS yang sama!

Padahal, jika server atau akun cloud tersebut rusak bersamaan, salinan di dalamnya ikut lenyap. Artikel ini merangkum **strategi dan cara terbaik membackup server Linux untuk pemula**—dari konsep dasar yang wajib dipahami hingga implementasi modern yang hemat biaya, otomatis, dan terenkripsi.

---

## 1. Pahami Dulu Aturan Emas Backup: **3 - 2 - 1**

Di dunia manajemen server, standar paling sederhana namun terbukti ampuh disebut **aturan 3-2-1**:

- **3 salinan data:** 1 data asli yang aktif di server + minimal 2 salinan cadangan.
- **2 jenis media/penyimpanan berbeda:** Misalnya disk VPS sebagai lokasi utama + Object Storage (AWS S3, Cloudflare R2, Backblaze B2) atau server penyimpanan terpisah.
- **1 salinan di luar lokasi utama (*offsite*):** Salinan ini **wajib berada di luar akun/penyedia VPS utama**. Jadi, sekalipun penyedia VPS-mu bangkrut, mengalami kebakaran pusat data, atau akunmu diretas, data backup-mu tetap utuh di tempat lain!

---

## 2. Jebakan Pemula: Snapshot VPS vs `rsync` vs Backup Modern (`restic`)

Sebelum memilih alat, pahami kelebihan dan batasan ketiga pendekatan populer ini:

| Metode Backup | Kelebihan | Kelemahan Utama | Cocok Untuk Siapa? |
| --- | --- | --- | --- |
| **Snapshot Panel VPS** | Satu klik dari dashboard provider, memulihkan seluruh OS dengan cepat. | Tersimpan di akun cloud yang sama (gagal aturan *offsite*); database aktif bisa tidak konsisten; susah memulihkan 1 file saja. | Jaring pengaman cepat **sebelum upgrade OS besar** (bukan backup tunggal!). |
| **`rsync` / `tar` Manual** | Bawaan Linux, mudah dipahami cara kerjanya. | Tidak otomatis mengenkripsi data di tujuan; `rsync` biasa menimpa perubahan tanpa riwayat versi (*versioning*) kecuali ditambah skrip rumit. | Transfer folder sementara atau server lokal sederhana. |
| **`restic` / `borgbackup` ke Storage Terpisah** | **Otomatis terenkripsi** sebelum dikirim, **deduplikasi** (hanya kirim bagian file yang berubah!), dan menyimpan riwayat harian/mingguan dengan hemat kuota. | Butuh penyiapan skrip awal ~15 menit (hanya sekali di awal!). | **Rekomendasi terbaik (#1)** untuk server Linux produksi & pemula serius! |

> **Singkatnya:** Jika kamu mencari **cara terbaik secara keseluruhan** untuk VPS Linux saat ini, kombinasikan **dump database resmi + `restic` otomatis ke Object Storage S3-compatible (atau VPS cadangan via SFTP)**.

---

## 3. Apa Saja yang Wajib Di-backup (dan Apa yang Tidak Perlu)?

Jangan mem-backup seluruh isi root `/` secara membabi buta karena hanya akan memboroskan ruang penyimpanan dan bandwidth:

### Wajib Di-backup:
1. **Database via alat *dump* resmi** (PostgreSQL, MySQL/MariaDB, SQLite). **Jangan pernah** menyalin folder mentah `/var/lib/postgresql` atau `/var/lib/mysql` saat database sedang menyala karena hasilnya sangat rawan korup!
2. **Konfigurasi sistem (`/etc`)**: Pengaturan Nginx/Caddy, SSH, firewall, systemd unit kustom, dan sertifikat.
3. **Data & unggahan aplikasi (`/srv`, `/opt`, `/var/www`)**: Foto/dokumen upload pengguna, file konfigurasi produksi (`.env`), dan *Docker persistent volumes*.

### Tidak Perlu Di-backup:
- Folder virtual Linux (`/proc`, `/sys`, `/dev`, `/run`) dan folder sementara (`/tmp`, `/var/cache`).
- Dependensi yang bisa dipasang ulang dari kode (`node_modules/`, `vendor/`, Docker image cache) — cukup simpan kode sumber di Git dan *lockfile*-nya!

---

## 4. Langkah Praktis Setup Backup Terbaik untuk Pemula (`restic` + Object Storage S3/R2/B2)

Kenapa contoh di sini memakai **Object Storage** (seperti Cloudflare R2, Backblaze B2, Wasabi, atau AWS S3)? Karena biayanya sangat murah untuk ukuran backup pemula (sering kali hanya beberapa ribu rupiah per bulan atau bahkan masuk batas gratis awal), terpisah dari akun VPS, dan mendukung fitur pengunci anti-hapus (*Object Lock*).

*(Catatan: Jika kamu lebih suka menyimpan cadangan ke VPS cadangan terpisah lewat SFTP tanpa layanan Object Storage, kami sudah menulis panduan khusus langkah demi langkahnya di [tutorial backup server Debian dengan restic via SFTP](/posts/debian-backup-restore/).)*

### Langkah 1: Pasang `restic` di Server Linux

Di Debian/Ubuntu:

```bash
sudo apt update && sudo apt install -y restic
```

*(Di Fedora / RHEL / Rocky Linux: `sudo dnf install -y restic`.)*

### Langkah 2: Simpan Kredensial dengan Izin Ketat (`chmod 600`)

Masuk ke shell `root` (`sudo -i`) karena proses backup sistem akan berjalan terpusat, lalu buat folder konfigurasi yang hanya bisa dibaca `root`:

```bash
install -d -m 700 /root/.config/restic
```

1. **Buat kata sandi enkripsi `restic`** di `/root/.config/restic/password` (isi dengan string acak panjang dari *password manager*-mu, lalu simpan salinannya di luar VPS!):
   ```bash
   umask 077
   nano /root/.config/restic/password
   chmod 600 /root/.config/restic/password
   ```
2. **Buat file environment `/root/.config/restic/env`** berisi alamat bucket S3-compatible dan kunci akses (*access key* khusus bucket backup tersebut saja):
   ```bash
   nano /root/.config/restic/env
   chmod 600 /root/.config/restic/env
   ```
   Isi contoh (sesuaikan *endpoint* dan nama bucket dari penyedia Object Storage pilihanmu):
   ```bash
   export AWS_ACCESS_KEY_ID="ISI_ACCESS_KEY_KAMU"
   export AWS_SECRET_ACCESS_KEY="ISI_SECRET_KEY_KAMU"
   export RESTIC_REPOSITORY="s3:https://ENDPOINT_S3_KAMU/nama-bucket-backup"
   export RESTIC_PASSWORD_FILE="/root/.config/restic/password"
   ```

> **Peringatan krusial:** Jika password di `/root/.config/restic/password` hilang dan kamu tidak menyimpannya di luar VPS, **tidak ada siapa pun (termasuk penyedia cloud) yang bisa membuka file backup terenkripsimu!** Wajib simpan di *password manager* pribadimu.

### Langkah 3: Inisialisasi Gudang Backup Satu Kali

```bash
. /root/.config/restic/env
restic init
```

*(Jalankan `restic init` hanya satu kali saat bucket masih benar-benar kosong.)*

---

## 5. Cara Aman Mencadangkan Database (PostgreSQL, MySQL, & SQLite)

Sebelum memanggil `restic backup`, buat dulu *dump* database yang konsisten di `/var/backups/db`:

- **Jika memakai PostgreSQL:**
  ```bash
  runuser -u postgres -- pg_dump --format=custom --dbname=nama_db \
    > /var/backups/db/postgres.dump.tmp && \
    mv /var/backups/db/postgres.dump.tmp /var/backups/db/postgres.dump
  ```
- **Jika memakai MySQL / MariaDB:**
  ```bash
  mysqldump --single-transaction --routines --triggers nama_db \
    > /var/backups/db/mysql.sql.tmp && \
    mv /var/backups/db/mysql.sql.tmp /var/backups/db/mysql.sql
  ```
  *(Flag `--single-transaction` memastikan dump tetap konsisten tanpa mengunci tabel InnoDB selama proses berjalan.)*
- **Jika memakai SQLite:**
  ```bash
  sqlite3 /opt/app/data.db ".backup '/var/backups/db/data.db.tmp'" && \
    mv /var/backups/db/data.db.tmp /var/backups/db/data.db
  ```
  *(Jangan menyalin file `.db` SQLite dengan `cp` biasa karena mode `WAL` menyimpan transaksi terbaru di file `-wal` terpisah!)*

---

## 6. Gabungkan Menjadi Skrip Otomatis + Retensi (`forget --prune`)

Supaya backup berjalan rapi setiap hari dan cadangan berumur tahunan tidak terus menumpuk menghabiskan tagihan storage, gabungkan dalam satu skrip `/usr/local/sbin/backup-harian`:

```bash
#!/bin/bash
set -euo pipefail
umask 077
. /root/.config/restic/env

install -d -m 700 /var/backups/db

# 1. Dump database (sesuaikan dengan DB yang kamu pakai; hapus bagian yang tidak dipakai)
runuser -u postgres -- pg_dump --format=custom --dbname=nama_db \
  > /var/backups/db/postgres.dump.tmp
mv /var/backups/db/postgres.dump.tmp /var/backups/db/postgres.dump

# 2. Kirim backup terenkripsi ke Object Storage
restic backup \
  --exclude='**/node_modules' \
  --exclude='**/.git' \
  /etc /opt/aplikasiku /var/backups/db

# 3. Terapkan kebijakan retensi agar penyimpanan tetap hemat
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --prune
```

Beri izin eksekusi khusus `root` dan uji langsung sekarang:

```bash
chmod 700 /usr/local/sbin/backup-harian
/usr/local/sbin/backup-harian
restic snapshots
```

Arti kebijakan retensi di atas: simpan **7 backup harian terakhir**, **4 backup mingguan**, dan **6 backup bulanan**—sisanya dibersihkan otomatis oleh `--prune`.

### Jadwalkan Otomatis dengan `systemd timer`

Daripada hanya mengandalkan `cron` biasa, gunakan **`systemd timer`** dengan opsi `Persistent=true` agar jika server sempat mati pada jam jadwal, backup langsung dijalankan setelah menyala kembali (lihat juga penjelasan lengkapnya di [perbandingan `cron` vs `systemd timer`](/posts/linux-cli-otomatis-cron-systemd-timer/)):

Buat `/etc/systemd/system/backup-harian.service`:

```ini
[Unit]
Description=Backup Harian Server dengan Restic

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup-harian
```

Lalu buat `/etc/systemd/system/backup-harian.timer`:

```ini
[Unit]
Description=Jadwal Backup Harian Pukul 03:00

[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=10m
Persistent=true

[Install]
WantedBy=timers.target
```

Aktifkan jadwalnya:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backup-harian.timer
systemctl list-timers --all | grep backup-harian
```

---

## 7. Tiga Aturan Keamanan Backup yang Tidak Boleh Ditawar

1. **Lindungi backup dari penghapusan (*Anti-Ransomware*):**  
   Jika peretas berhasil merebut akses `root` di VPS-mu lalu menemukan file `/root/.config/restic/env`, mereka bisa mencoba menjalankan `restic forget --prune` untuk menghapus semua cadanganmu! Karena itu:
   - Aktifkan fitur **Object Lock / Retention** (atau pisahkan izin *append-only* pada bucket/server backup sehingga mesin produksi hanya boleh menambah data, **tidak boleh menghapus** data lama selama masa retensi), atau jalankan tugas `restic forget --prune` dari mesin admin terpisah, bukan dari VPS produksi yang sama.
2. **Jangan pernah menguji backup cuma dengan melihat status sukses:**  
   Backup yang belum pernah diuji *restore*-nya bisa saja ternyata kosong karena salah path atau password tertukar! Biasakan **sebulan sekali** melakukan simulasi pemulihan ke folder sementara:
   ```bash
   . /root/.config/restic/env
   restic restore latest --target /tmp/uji-restore
   ls -la /tmp/uji-restore/var/backups/db/
   rm -rf /tmp/uji-restore
   ```
   *(Cek juga keutuhan arsip berkala dengan `restic check`, dan pastikan ruang disk lokalmu cukup saat uji restore dengan [cara cek kapasitas disk `df -h`](/posts/linux-cli-pantau-cpu-ram-disk/).)*
3. **Catat langkah pemulihan darurat (*Disaster Recovery Note*):**  
   Simpan catatan singkat di luar server berisi: cara membuat VPS baru, kunci akses Object Storage, password `restic`, dan urutan perintah `restic restore` + `pg_restore` agar di hari sial nanti kamu cukup membaca langkahnya dengan kepala dingin.

---

## Checklist Singkat Backup Ideal untuk Pemula

- [x] Salinan backup tersimpan **di luar penyedia VPS utama** (*offsite*, aturan 3-2-1).
- [x] Database di-dump menggunakan alat resminya (`pg_dump` / `mysqldump --single-transaction` / `sqlite3 .backup`), bukan disalin mentah.
- [x] Data dienkripsi sebelum keluar dari server dan password enkripsinya tersimpan di *password manager* di luar VPS.
- [x] Jadwal backup berjalan otomatis (`systemd timer`) beserta kebijakan retensi yang teratur.
- [x] Sudah pernah menguji perintah `restic restore` ke folder sementara dan memastikan file serta dump database benar-benar bisa dibuka.

---

## Referensi

- [Restic Documentation: Stable Manual](https://restic.readthedocs.io/en/stable/)
- [Restic Documentation: Preparing a new repository](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html)
- [Restic Documentation: Restoring from backup](https://restic.readthedocs.io/en/stable/050_restore.html)
- [Debian Manpage: `systemd.timer(5)`](https://manpages.debian.org/trixie/systemd/systemd.timer.5.en.html)
- [Artikel Terkait: Backup server Debian 13 dengan restic via SFTP dan uji pemulihan](/posts/debian-backup-restore/)
