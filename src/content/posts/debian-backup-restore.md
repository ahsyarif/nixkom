---
title: "Backup server Debian 13 dengan restic dan uji pemulihan"
date: 2026-11-11T21:07:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "backup", "restic", "postgresql"]
description: "Cadangkan konfigurasi, unggahan, dan PostgreSQL Debian 13 ke server terpisah dengan restic, lalu uji pemulihan tanpa menimpa produksi."
---

Backup di disk VPS yang sama ikut hilang kalau VPS atau disknya hilang. Simpan salinan terenkripsi di mesin terpisah, jadwalkan pencadangan, lalu buktikan bahwa berkas dan database bisa dipulihkan. Contoh Debian 13 ini memakai restic melalui SFTP dan PostgreSQL.

Contoh aplikasi bernama `tokoku` menyimpan unggahan di `/srv/tokoku/uploads` dan database PostgreSQL bernama `tokoku`. Ganti keduanya sesuai aplikasimu. Server backup memakai IP dokumentasi `203.0.113.20`; ganti dengan alamat mesin terpisah milikmu. Semua langkah berikut dijalankan **di server aplikasi**, kecuali disebut lain. Jangan jalankan perintah database jika aplikasimu tidak memakai PostgreSQL.

## Siapkan tujuan dan bahan pemulihan

Sebelum mulai, siapkan server backup dengan akun khusus `backup` yang hanya dapat mengakses penyimpanan cadangan miliknya. Direktori `/srv/restic/tokoku` harus dapat ditulis akun itu. Batasi akun ke SFTP melalui pengaturan SSH server backup; jangan gunakan akun admin aplikasi sebagai akun penyimpanan. Jika akun memakai chroot, path yang terlihat melalui SFTP bisa berbeda dari path pada host: contoh ini mengasumsikan `/srv/restic/tokoku` terlihat dari sesi SFTP.

Kamu memerlukan akses administrator ke mesin backup untuk memasang kunci publik dan memeriksa fingerprint-nya. Kebijakan retensi atau snapshot yang tidak bisa dihapus oleh akun SFTP sebaiknya diatur dari sisi penyimpanan. **Enkripsi melindungi isi backup, bukan dari penghapusan oleh orang yang menguasai kredensial penyimpanan.**

Di server aplikasi, pasang alat lalu masuk ke shell root agar kredensial dan pengalihan keluaran memakai hak akses yang konsisten:

```bash
# di server aplikasi, sebagai admin
sudo apt update
sudo apt install restic openssh-client postgresql-client
sudo -i
```

Sisa contoh administrasi memakai shell **root** ini. Jangan mencampur `export` milik pengguna biasa dengan `sudo restic`: sudo dapat membuang variabel lingkungan tersebut.

```bash
# di server aplikasi, sebagai root
install -d -m 700 /root/.ssh /root/.config/restic
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519_backup -C 'restic-tokoku'
```

Jangan menimpa kunci yang sudah ada. Untuk pekerjaan tanpa operator, kunci SSH tanpa passphrase hanya layak jika berkas privat tetap berizin `600` dan akun tujuan dibatasi. Kunci interaktif dengan passphrase memerlukan agen/kredensial yang tersedia bagi pekerjaan terjadwal; contoh timer di bawah tidak menyiapkannya.

Pasang **hanya kunci publik** `/root/.ssh/id_ed25519_backup.pub` pada akun backup di mesin tujuan lewat akses administrasi yang sudah kamu percaya. Cocokkan fingerprint host SSH dengan yang dibaca melalui konsol server backup, bukan sekadar menerima hasil `ssh-keyscan`.

Tambahkan blok berikut ke `/root/.ssh/config`, tanpa menghapus konfigurasi lain:

```text
Host backup-tokoku
    HostName 203.0.113.20
    User backup
    IdentityFile /root/.ssh/id_ed25519_backup
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

Untuk menyimpan host key pertama kali, hubungkan secara interaktif dengan `sftp -o StrictHostKeyChecking=ask backup-tokoku`, cocokkan fingerprint lewat konsol, lalu terima hanya jika sama. Setelah tersimpan di `known_hosts`, pengaturan `yes` akan menolak host key yang berubah. Jalankan `quit` untuk keluar dari SFTP.

## Buat repositori terenkripsi satu kali

Masih sebagai root, buat berkas kata sandi **baru**:

```bash
umask 077
nano /root/.config/restic/password
chmod 600 /root/.config/restic/password
nano /root/.config/restic/env
```

Isi `password` dengan satu kata sandi acak yang panjang dari pengelola kata sandi. Jangan menaruhnya di perintah terminal atau repositori Git. Isi `env` dengan:

```bash
export RESTIC_REPOSITORY='sftp:backup-tokoku:/srv/restic/tokoku'
export RESTIC_PASSWORD_FILE='/root/.config/restic/password'
```

Kemudian:

```bash
chmod 600 /root/.config/restic/env
. /root/.config/restic/env
restic init
restic snapshots
```

`restic init` hanya untuk repositori baru. Jika repositori sudah ada, langsung gunakan `snapshots`; jangan mencoba mengosongkannya agar `init` berhasil.

Simpan salinan kata sandi restic di pengelola kata sandi di luar VPS. Simpan juga alamat repositori, prosedur akses SFTP, dan cara memasang kunci pengganti dari server pemulihan. Backup yang bisa diunduh tetapi kata sandinya hilang tetap tidak dapat dibaca.

## Cadangkan database secara konsisten

Jangan menyalin `/var/lib/postgresql` saat PostgreSQL berjalan sebagai pengganti backup database. Gunakan `pg_dump` untuk snapshot logis satu database. Contoh mengasumsikan database `tokoku` sudah ada dan akun sistem `postgres` dapat terhubung secara lokal.

Buat `/usr/local/sbin/backup-tokoku` sebagai root:

```bash
nano /usr/local/sbin/backup-tokoku
```

Isinya:

```bash
#!/bin/bash
set -euo pipefail
umask 077
. /root/.config/restic/env

install -d -m 700 /var/backups/tokoku
runuser -u postgres -- pg_dump --format=custom --dbname=tokoku \
    > /var/backups/tokoku/database.dump.tmp
mv /var/backups/tokoku/database.dump.tmp /var/backups/tokoku/database.dump

restic backup --tag tokoku \
    /etc /srv/tokoku/uploads /var/backups/tokoku/database.dump
```

Pengalihan keluaran dilakukan shell root, jadi akun `postgres` tidak perlu bisa menulis ke direktori backup. `set -e` menghentikan skrip jika dump gagal; berkas sementara baru menggantikan dump sebelumnya setelah sukses. Jangan melanjutkan pencadangan dengan dump gagal atau setengah jadi.

```bash
chmod 700 /usr/local/sbin/backup-tokoku
/usr/local/sbin/backup-tokoku
restic snapshots --tag tokoku
restic check
```

`restic check` memeriksa struktur repositori. Untuk membaca dan memverifikasi seluruh data tersimpan, gunakan `restic check --read-data` secara berkala; proses ini bisa mahal dalam waktu dan biaya transfer.

`pg_dump` konsisten untuk satu database, tetapi tidak mencadangkan role global PostgreSQL dan tidak menyinkronkan waktu dump dengan berkas unggahan. Catat role, extension, dan konfigurasi yang diperlukan untuk membangun ulang database. Untuk aplikasi yang membutuhkan kecocokan persis antara database dan unggahan, hentikan penulisan aplikasi selama dump serta backup, atau gunakan prosedur snapshot terkoordinasi. Jangan menyatakan backup konsisten lintas komponen hanya karena kedua path masuk dalam satu snapshot restic.

## Jadwalkan dan periksa kegagalannya

Sebagai root, buat `/etc/systemd/system/backup-tokoku.service`:

```ini
[Unit]
Description=Backup tokoku to off-server restic repository
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup-tokoku
UMask=0077
```

Lalu `/etc/systemd/system/backup-tokoku.timer`:

```ini
[Unit]
Description=Daily tokoku backup

[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
```

Jadwal mengikuti zona waktu server yang ditampilkan `timedatectl`. Terapkan setelah percobaan manual berhasil:

```bash
systemctl daemon-reload
systemctl enable --now backup-tokoku.timer
systemctl list-timers backup-tokoku.timer
systemctl status backup-tokoku.service
journalctl -u backup-tokoku.service --since '7 days ago'
```

Pekerjaan `oneshot` bisa berstatus `inactive` setelah selesai; periksa hasil eksekusi dan waktu snapshot terakhir, bukan hanya apakah prosesnya sedang hidup. Sambungkan kegagalan unit dan umur snapshot ke pemantauan yang benar-benar kamu baca. Timer aktif tidak membuktikan backup terakhir berhasil. Backup ini terus menambah snapshot; pantau kapasitas dan tetapkan retensi dari sisi penyimpanan sebelum ruang habis.

## Pulihkan ke lokasi terpisah, bukan ke produksi

Latihan terbaik memakai mesin Debian pemulihan terpisah. Untuk latihan di server yang sama, tetap gunakan direktori baru dan database baru; ini menguji data tetapi belum membuktikan kamu dapat membangun ulang seluruh VPS.

Pada shell root dengan akses repositori yang sudah disiapkan:

```bash
. /root/.config/restic/env
restic snapshots --tag tokoku
```

Pilih ID snapshot yang memuat path yang benar. Contoh berikut meminta ID tersebut agar tidak diam-diam memakai snapshot terbaru dari pekerjaan lain:

```bash
read -r -p 'ID snapshot tokoku: ' SNAPSHOT
RESTORE_DIR=$(mktemp -d /var/tmp/tokoku-restore.XXXXXX)
restic restore "$SNAPSHOT" --target "$RESTORE_DIR"
printf 'Hasil pemulihan: %s\n' "$RESTORE_DIR"
```

Path absolut dipulihkan di bawah direktori tujuan. Jadi dump ada di `$RESTORE_DIR/var/backups/tokoku/database.dump`, bukan langsung di root sistem. Jangan gunakan `--target /` untuk latihan.

Periksa satu unggahan yang kamu kenali: buka gambar hasil pemulihan atau cocokkan checksum-nya dengan catatan yang dibuat saat backup. Jika berkas sumber belum berubah, perbandingan berikut harus tidak menghasilkan perbedaan setelah nama berkas diganti dengan unggahan nyata:

```bash
cmp /srv/tokoku/uploads/contoh.jpg \
    "$RESTORE_DIR/srv/tokoku/uploads/contoh.jpg"
```

Untuk database, buat database latihan bernama unik yang belum ada. `createdb` sengaja akan gagal jika nama itu sudah dipakai. Jangan mengganti nama di bawah menjadi database produksi:

```bash
runuser -u postgres -- createdb tokoku_restore_latihan
runuser -u postgres -- pg_restore --exit-on-error --no-owner --no-privileges \
    --dbname=tokoku_restore_latihan \
    < "$RESTORE_DIR/var/backups/tokoku/database.dump"
runuser -u postgres -- psql --dbname=tokoku_restore_latihan -c '\dt'
```

Root membuka dump melalui pengalihan stdin; akun `postgres` tidak perlu mendapat akses ke seluruh direktori pemulihan. `--no-owner --no-privileges` sengaja melewati kepemilikan dan grant untuk latihan data, bukan resep pemulihan izin produksi. Database baru memerlukan extension yang sesuai jika aplikasi memakainya.

Daftar tabel belum cukup. Jalankan kueri terhadap tabel aplikasimu, periksa beberapa record yang kamu kenali, dan bandingkan dengan catatan saat pencadangan. Contohnya, jika memang ada tabel `public.products`:

```bash
runuser -u postgres -- psql --dbname=tokoku_restore_latihan \
    -c 'SELECT id, name FROM public.products ORDER BY id LIMIT 5;'
```

Ganti tabel dan kolom sesuai skema nyata. Jangan menjalankan aplikasi produksi dengan database latihan. Catat waktu pemulihan, ketergantungan yang kurang, dan bahan akses yang kamu butuhkan. Simpan catatan itu di luar server aplikasi bersama bahan pemulihan.

## Referensi

- [Restic: repositori SFTP dan persiapan backup](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html)
- [Restic: pemeriksaan repositori](https://restic.readthedocs.io/en/stable/045_working_with_repos.html)
- [Restic: pemulihan snapshot](https://restic.readthedocs.io/en/stable/050_restore.html)
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [systemd.timer(5), Debian trixie](https://manpages.debian.org/trixie/systemd/systemd.timer.5.en.html)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. **Backup dan uji restore (artikel ini)**
