---
title: "Backup server Debian 13 dengan restic dan uji pemulihan"
date: 2026-11-11T21:07:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "backup", "restic", "postgresql"]
description: "Cadangkan konfigurasi, unggahan, dan PostgreSQL Debian 13 ke server terpisah dengan restic, lalu uji pemulihan tanpa menimpa produksi."
---

Menyimpan file backup di dalam disk VPS yang sama itu ibarat menaruh kunci cadangan rumah di dalam rumah itu sendiri: kalau disk VPS rusak, akun provider bermasalah, atau server terhapus tidak sengaja, salinan backup-mu ikut hilang.

Ada dua aturan dasar backup yang sehat:
1. **Simpan di mesin terpisah** dalam kondisi terenkripsi.
2. **Uji pemulihannya (*restore*)** — backup yang belum pernah diuji pulihkan baru sekadar harapan, bukan jaminan!

Dalam panduan Debian 13 ini, kita memakai **`restic`** (alat backup modern yang otomatis mengenkripsi dan menghemat ruang dengan menyimpan bagian yang berubah saja) melalui **SFTP** (transfer file terenkripsi lewat jalur SSH) untuk mencadangkan konfigurasi, file unggahan, serta database **PostgreSQL**.

Sebagai ilustrasi, contoh aplikasi bernama `tokoku` menyimpan file unggahan di `/srv/tokoku/uploads` dan memakai database PostgreSQL bernama `tokoku`. Server tujuan backup menggunakan IP contoh `203.0.113.20` (ganti dengan alamat mesin terpisah milikmu). Semua langkah di bawah dijalankan **di server aplikasi**, kecuali disebut lain. (Jika aplikasimu tidak memakai PostgreSQL, lewati bagian perintah databasenya).

## 1. Siapkan server tujuan dan kunci akses khusus

Sebelum mulai di server aplikasi, pastikan kamu sudah menyiapkan mesin/server backup terpisah dengan sebuah akun khusus (misalnya bernama `backup`) yang hanya boleh dipakai untuk menyimpan cadangan di `/srv/restic/tokoku`.

Tips keamanan sisi penyimpanan:
- Di pengaturan SSH server backup, batasi akun `backup` agar hanya bisa memakai SFTP (tidak bisa membuka terminal *shell*). Jangan memakai akun `admin` aplikasi sebagai akun penyimpanan.
- Jika akun `backup` memakai isolasi folder (*chroot*), pastikan alamat folder yang terlihat dari sisi SFTP cocok (contoh di artikel ini mengasumsikan `/srv/restic/tokoku` langsung terlihat dari sesi SFTP).
- Kamu tetap membutuhkan akses admin ke server backup untuk memasang kunci publik dan memeriksa *fingerprint*-nya. Kebijakan penghapusan/retensi atau proteksi agar snapshot tidak bisa dihapus oleh akun SFTP sebaiknya diatur dari sisi server penyimpanan. **Ingat:** enkripsi `restic` melindungi *kerahasiaan isi* backup dari penyadap, bukan mencegah *penghapusan* oleh orang yang berhasil menguasai akun penyimpanannya.

Sekarang di **server aplikasi**, pasang paket yang dibutuhkan (`restic`, klien SSH, dan klien PostgreSQL), lalu masuk ke mode `root` dengan `sudo -i`:

```bash
# di server aplikasi, sebagai admin
sudo apt update
sudo apt install restic openssh-client postgresql-client
sudo -i
```

Mengapa kita masuk ke *shell* `root` (`sudo -i`)? Karena proses backup otomatis nanti akan berjalan sebagai sistem (`root`), dan menjalankan perintah seperti `sudo restic` sering kali membuang variabel lingkungan (*environment variables*) yang kita muat lewat `export`. Dengan masuk ke shell `root` penuh, hak akses dan variabel konfigurasinya konsisten.

Sekarang buat folder konfigurasi aman dan pasangan kunci SSH khusus backup:

```bash
# di server aplikasi, sebagai root
install -d -m 700 /root/.ssh /root/.config/restic
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519_backup -C 'restic-tokoku'
```

- Jangan menimpa kunci lain yang sudah ada.
- Ketika ditanya *passphrase*, karena backup ini nanti akan berjalan otomatis jam 3 pagi tanpa ada manusia yang mengetikkan kata sandi, kita membiarkannya kosong—**tetapi** syaratnya file kunci privat ini wajib berizin `600` (hanya `root` yang boleh baca) dan akun `backup` di server tujuan harus dibatasi ke SFTP saja. (Kunci yang memakai *passphrase* membutuhkan pengelola agen kredensial khusus yang tidak disiapkan di contoh ini).

Pasang **hanya kunci publiknya** (`/root/.ssh/id_ed25519_backup.pub`) ke akun `backup` di server tujuan lewat akses admin yang sudah kamu percaya. Cocokkan juga *fingerprint* server backup lewat konsolnya (jangan asal menerima dari `ssh-keyscan`).

Selanjutnya, daftarkan pintasan koneksi SSH di `/root/.ssh/config` tanpa menghapus isi lain yang mungkin sudah ada:

```text
Host backup-tokoku
    HostName 203.0.113.20
    User backup
    IdentityFile /root/.ssh/id_ed25519_backup
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

Untuk mengenali sidik jari (*host key*) server backup pertama kali dengan aman, sambungkan secara interaktif sekali:

```bash
sftp -o StrictHostKeyChecking=ask backup-tokoku
```

Cocokkan *fingerprint* yang muncul dengan konsol server backup; hanya ketik `yes` kalau sama persis. Setelah tersimpan di `known_hosts`, setelan `StrictHostKeyChecking yes` pada konfigurasi di atas akan otomatis menolak koneksi jika suatu hari identitas server tujuan mendadak berubah. Ketik `quit` untuk keluar dari SFTP.

## 2. Buat repositori terenkripsi satu kali

Masih sebagai `root`, kita buat file berisi kata sandi enkripsi `restic` dan file penampung variabel lingkungannya. Kita jalankan `umask 077` terlebih dulu agar setiap file baru yang dibuat langsung terkunci rapat (hanya bisa dibaca `root`):

```bash
umask 077
nano /root/.config/restic/password
chmod 600 /root/.config/restic/password
nano /root/.config/restic/env
```

Isi `/root/.config/restic/password` dengan satu kata sandi acak yang panjang dan kuat dari *password manager*-mu. Jangan pernah menuliskan kata sandi ini langsung di perintah terminal atau menyimpannya ke Git.

Isi `/root/.config/restic/env` dengan lokasi penyimpanan dan lokasi file kata sandi:

```bash
export RESTIC_REPOSITORY='sftp:backup-tokoku:/srv/restic/tokoku'
export RESTIC_PASSWORD_FILE='/root/.config/restic/password'
```

Lalu kunci izin filenya, muat konfigurasinya ke terminal (tanda titik `.` di depan membaca isi file ke sesi aktif), dan inisialisasi gudang backup baru:

```bash
chmod 600 /root/.config/restic/env
. /root/.config/restic/env
restic init
restic snapshots
```

> **Catatan:** `restic init` hanya dijalankan **satu kali** saat membuat repositori baru yang masih kosong. Jika repositori sudah pernah dibuat sebelumnya, langsung jalankan `restic snapshots`—jangan pernah mengosongkan repositori yang sudah ada hanya supaya `init` bisa jalan.

**Wajib lakukan sekarang:** Simpan salinan kata sandi `restic` tadi ke *password manager* di **luar VPS** (misalnya di laptop atau penyimpanan aman pribadimu). Catat juga alamat repositori, cara akses SFTP, dan langkah memasang kunci SSH baru jika nanti harus memulihkan di server pengganti. Backup yang berhasil diunduh tidak akan bisa dibuka sama sekali kalau kamu kehilangan kata sandinya!

## 3. Cadangkan database dan file secara aman

Kesalahan yang sering terjadi saat mem-backup PostgreSQL adalah langsung menyalin folder mentah `/var/lib/postgresql` ketika database sedang aktif bekerja. Bayangkan menyalin buku kas dengan mesin fotokopi sementara akuntannya terus menulis di halaman yang sama—hasil salinannya bisa rusak (*corrupt*) dan tidak konsisten!

Cara yang benar adalah memakai **`pg_dump`**, yang mengambil potret logis yang rapi dan utuh untuk satu database tanpa mengganggu aplikasi yang sedang berjalan (contoh mengasumsikan database `tokoku` sudah ada dan akun sistem `postgres` bisa terhubung secara lokal).

Sebagai `root`, buat skrip backup di `/usr/local/sbin/backup-tokoku`:

```bash
nano /usr/local/sbin/backup-tokoku
```

Masukkan skrip berikut:

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

Mari pahami mengapa skrip kecil ini ditulis dengan hati-hati:
- `set -euo pipefail`: membuat skrip **langsung berhenti** jika ada satu langkah saja yang gagal (misalnya `pg_dump` error). Kita tidak mau mengirim backup setengah jadi.
- `runuser -u postgres -- pg_dump ... > ...tmp`: PostgreSQL dijalankan sebagai user `postgres` untuk membaca data, sementara penulisan file `.tmp` dilakukan oleh *shell* `root` sehingga user `postgres` tidak butuh izin tulis ke `/var/backups/tokoku`.
- `mv ...tmp ...dump`: file dump baru hanya menggantikan file dump lama jika `pg_dump` benar-benar sukses 100%.
- `restic backup --tag tokoku ...`: mengirim salinan terenkripsi folder konfigurasi `/etc`, folder unggahan `/srv/tokoku/uploads`, dan hasil dump database ke server tujuan.

Beri izin eksekusi khusus `root`, lalu uji jalankan secara manual dan periksa hasilnya:

```bash
chmod 700 /usr/local/sbin/backup-tokoku
/usr/local/sbin/backup-tokoku
restic snapshots --tag tokoku
restic check
```

Perintah `restic check` memeriksa keutuhan struktur repositori. Untuk memeriksa dan membaca seluruh isi datanya secara menyeluruh, kamu bisa sesekali menjalankan `restic check --read-data` (namun perlu diingat, ini memakan waktu lebih lama dan kuota transfer jaringan lebih besar).

**Dua hal teknis yang perlu dicatat:**
1. `pg_dump` mencadangkan isi satu database beserta tabelnya secara konsisten, tetapi tidak ikut mencadangkan daftar pengguna (*role*) global PostgreSQL. Catat *role*, *extension*, dan konfigurasi lain yang dibutuhkan untuk membangun ulang database dari nol.
2. `pg_dump` berjalan sedikit lebih awal daripada pencadangan file `/srv/tokoku/uploads`. Jika aplikasimu sangat sensitif terhadap kecocokan persis detik-per-detik antara catatan database dan file unggahan, hentikan proses penulisan aplikasi sejenak selama backup berlangsung atau gunakan mekanisme snapshot yang terkoordinasi.

## 4. Jadwalkan backup otomatis dengan `systemd timer`

Setelah uji coba manual sukses, kita buat jadwal otomatis setiap pukul 03.30 pagi memakai `systemd`.

Pertama, buat definisi tugasnya (*service*) di `/etc/systemd/system/backup-tokoku.service` sebagai `root`:

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

(`Type=oneshot` berarti layanan ini bukan program yang terus menyala seharian, melainkan skrip yang jalan sekali lalu selesai. `Wants/After=network-online.target` memastikan jaringan sudah aktif sebelum berjalan).

Kedua, buat jadwal pemicunya (*timer*) di `/etc/systemd/system/backup-tokoku.timer`:

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

- `OnCalendar=*-*-* 03:30:00`: berjalan tiap hari pukul 03.30 mengikuti zona waktu server (cek dengan `timedatectl`).
- `RandomizedDelaySec=15m`: mengacak jeda 0–15 menit supaya tidak menabrak jadwal server lain.
- `Persistent=true`: jika server kebetulan mati saat jam 03.30, backup otomatis disusulkan begitu server menyala kembali.

Aktifkan jadwalnya dan cek log-nya:

```bash
systemctl daemon-reload
systemctl enable --now backup-tokoku.timer
systemctl list-timers backup-tokoku.timer
systemctl status backup-tokoku.service
journalctl -u backup-tokoku.service --since '7 days ago'
```

Ingat: karena tugas `oneshot` langsung berhenti setelah selesai, melihat status `inactive` pada `.service` adalah hal normal. Yang harus kamu pantau adalah **apakah eksekusi terakhirnya sukses** dan **kapan snapshot terbaru tercipta**—bukan sekadar melihat timer-nya aktif. Jangan lupa juga mengatur kebijakan pembersihan (*retention*) dari sisi penyimpanan sebelum kapasitas disk penuh oleh tumpukan snapshot harian.

## 5. Uji pemulihan (*restore*) ke tempat terpisah, bukan ke produksi!

Jangan menunggu musibah datang baru pertama kali mencoba `restic restore`. Ide terbaik adalah berlatih di mesin Debian lain yang terpisah. Namun kalau kamu berlatih di server yang sama, **wajib memulihkan ke folder baru dan database baru** agar tidak menimpa data aplikasi yang sedang berjalan! (Catatan: berlatih di server yang sama menguji keutuhan datamu, tetapi belum menguji kemampuanmu membangun ulang seluruh VPS dari nol).

Masuk ke shell `root` dan muat variabel `restic`, lalu lihat daftar snapshot:

```bash
. /root/.config/restic/env
restic snapshots --tag tokoku
```

Pilih ID snapshot milik `tokoku` yang ingin diuji, lalu pulihkan ke folder sementara yang baru dibuat (`mktemp -d`):

```bash
read -r -p 'ID snapshot tokoku: ' SNAPSHOT
RESTORE_DIR=$(mktemp -d /var/tmp/tokoku-restore.XXXXXX)
restic restore "$SNAPSHOT" --target "$RESTORE_DIR"
printf 'Hasil pemulihan: %s\n' "$RESTORE_DIR"
```

Karena `--target` diarahkan ke `$RESTORE_DIR`, struktur foldernya dipulihkan di dalam folder sementara tersebut (misalnya dump database ada di `$RESTORE_DIR/var/backups/tokoku/database.dump`). **Jangan pernah memakai `--target /`** saat latihan karena itu langsung menimpa sistem produksi!

### Verifikasi file unggahan dan database

Pertama, uji salah satu file unggahan yang kamu kenal (ganti `contoh.jpg` dengan file asli di servermu). Perintah `cmp` membandingkan dua file byte demi byte—jika filenya belum berubah sejak dibackup, `cmp` tidak akan mengeluarkan pesan perbedaan apa pun:

```bash
cmp /srv/tokoku/uploads/contoh.jpg \
    "$RESTORE_DIR/srv/tokoku/uploads/contoh.jpg"
```

Kedua, buat database latihan baru dengan nama unik untuk memulihkan dump PostgreSQL (`createdb` otomatis menolak jika nama database sudah ada, sehingga aman dari salah ketik ke database produksi):

```bash
runuser -u postgres -- createdb tokoku_restore_latihan
runuser -u postgres -- pg_restore --exit-on-error --no-owner --no-privileges \
    --dbname=tokoku_restore_latihan \
    < "$RESTORE_DIR/var/backups/tokoku/database.dump"
runuser -u postgres -- psql --dbname=tokoku_restore_latihan -c '\dt'
```

Penjelasan singkat:
- `root` mengalirkan isi file dump melalui stdin (`<`) ke `pg_restore`, jadi akun `postgres` tidak perlu diberi akses membaca folder pemulihan sementara.
- Opsi `--no-owner --no-privileges` sengaja dipakai untuk latihan membaca data tanpa terbentur aturan kepemilikan; saat pemulihan produksi sungguhan, kamu tetap perlu menata izin dan *extension* yang sesuai.

Melihat daftar tabel (`\dt`) saja belum membuktikan isinya sehat. Jalankan satu query untuk melihat isi baris data aslinya (ganti `public.products` dan kolomnya sesuai tabel di aplikasimu):

```bash
runuser -u postgres -- psql --dbname=tokoku_restore_latihan \
    -c 'SELECT id, name FROM public.products ORDER BY id LIMIT 5;'
```

Pastikan kamu **tidak** menyambungkan aplikasi produksi ke database latihan ini. Setelah selesai latihan, catat berapa lama waktu yang dibutuhkan untuk memulihkan data, komponen apa yang kurang, serta kredensial apa saja yang dibutuhkan—lalu simpan catatan prosedur pemulihan itu di luar server aplikasi bersama kata sandi `restic`-mu.

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
