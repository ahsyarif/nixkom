---
title: "Permission file di Debian 13: perbaiki upload tanpa chmod 777"
date: 2026-11-11T21:05:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "permission", "chmod"]
description: "Perbaiki izin folder unggahan di Debian 13 tanpa chmod 777: telusuri pemilik, batasi akses proses aplikasi, lalu uji baca dan tulis."
---

`chmod -R 777` pada direktori proyek memberi semua akun izin menulis kode dan data di dalamnya. Kalau fitur unggahan gagal dengan pesan `Permission denied`, cari akun yang menjalankan aplikasi dan direktori yang menolak akses. Ubah izin pada lokasi itu, bukan seluruh proyek.

Semua perintah di bawah dijalankan **di server** Debian 13 dengan akun admin yang punya `sudo`. Contohnya memakai aplikasi fiktif bernama `tokoku` di `/srv/tokoku`. Ganti nama, path, dan user dengan milikmu sendiri; jangan salin mentah-mentah kalau struktur servermu berbeda.

## Cara baca permission: file beda dengan folder

`ls -l` menampilkan tiga kelompok izin: pemilik (*owner*), grup, dan yang lain (*others*), masing-masing `r` (baca), `w` (tulis), `x` (eksekusi).

```text
-rw-r----- 1 root tokoku 214 Nov 11 20:10 app.env
drwxr-x--- 2 tokoku www-data 4096 Nov 11 20:12 uploads
```

Artinya berbeda untuk file dan folder:

| Izin | Pada file | Pada folder |
|---|---|---|
| `r` | isi file boleh dibaca | nama isi folder boleh didaftar (`ls`) |
| `w` | isi file boleh diubah | boleh membuat, menghapus, dan mengganti nama entri di dalamnya |
| `x` | boleh dijalankan sebagai program | boleh mencari entri dan melintas ke path di dalamnya |

Poin terakhir sering membuat pemula bingung. Untuk membuka `/srv/tokoku/uploads/foto.jpg`, sebuah user butuh `x` di **setiap folder** sepanjang jalan (`/srv`, `/srv/tokoku`, `/srv/tokoku/uploads`) dan `r` di file itu. Satu folder induk tanpa `x` untuk user tersebut sudah cukup menolak seluruh jalur, sekalipun file-nya sendiri terbuka.

Pada direktori, membuat atau menghapus entri biasanya membutuhkan `w` bersama `x`. Izin direktori induk dapat memungkinkan penghapusan berkas walau isi berkasnya tidak boleh ditulis; izin `r` berkas bukan perlindungan dari penghapusan.

Angka mode adalah jumlah dari `r`=4, `w`=2, `x`=1 per kelompok. Tiga digit berurutan: pemilik, grup, others. Yang dipakai sehari-hari:

| Mode | Arti | Cocok untuk |
|---|---|---|
| `644` | pemilik baca-tulis, lainnya baca | file kode atau aset publik |
| `640` | pemilik baca-tulis, grup baca, lainnya tidak | berkas konfigurasi yang dibaca satu grup |
| `600` | hanya pemilik | kunci pribadi, kata sandi |
| `755` | pemilik penuh, lainnya baca dan lintas | folder kode atau folder publik |
| `750` | pemilik penuh, grup baca dan lintas, lainnya nol | folder yang dibatasi ke satu grup |

## Cari user runtime yang sebenarnya

Jangan berasumsi aplikasimu berjalan sebagai `www-data`. Itu bawaan umum untuk Nginx dan pool PHP-FPM bawaan, tetapi aplikasi yang dijalankan systemd bisa memakai akun lain, dan setiap pool PHP-FPM punya `user =` sendiri. Izin yang kamu setel untuk `www-data` tidak menolong kalau proses sebenarnya jalan sebagai `tokoku`.

Cek dari sumbernya:

```bash
# di server: aplikasi yang dijalankan systemd
systemctl show -p User -p Group tokoku.service
ps -o user=,group=,pid=,cmd= -C node          # ganti node dengan nama prosesmu

# di server: PHP-FPM, user ada di berkas pool
sudo grep -E '^(user|group)\s*=' /etc/php/*/fpm/pool.d/*.conf
```

Kalau `User=` kosong di `systemctl show`, unit itu jalan sebagai root. Itu temuan tersendiri: jalankan aplikasi web sebagai root sebaiknya dihindari, karena satu celah di aplikasi langsung menjadi akses root.

Kalau belum ada akun khusus, buat akun sistem tanpa login untuk aplikasimu:

```bash
# di server
sudo adduser --system --group --no-create-home --home /srv/tokoku tokoku
id tokoku
```

Lalu pastikan unit systemd-nya memakai akun itu (`User=tokoku` dan `Group=tokoku` di bagian `[Service]`). Dari sini panduan memakai `tokoku` sebagai user runtime. Kalau punyamu `www-data`, ganti saja.

## Pola yang aman: kode hanya-baca, uploads boleh ditulis

Rancangannya:

- Kode aplikasi dimiliki `root`, bisa dibaca user runtime, tidak bisa ditulisnya. Ini membatasi perubahan kode di disk oleh proses aplikasi, tetapi tidak mencegah penyerang menjalankan kode di memori atau menyalahgunakan akses data aplikasi.
- Hanya folder `uploads` yang dimiliki dan bisa ditulis user runtime.
- Rahasia (kata sandi basis data, API key) tidak berada di bawah folder yang dilayani web server.

Susunan contohnya:

```text
/srv/tokoku/app/        kode, root:root, folder 755, file 644
/srv/tokoku/uploads/    tokoku:www-data, 2750 (ditulis aplikasi, dibaca Nginx)
/etc/tokoku/app.env     root:tokoku, 640 (rahasia, di luar root web)
```

### Lihat dulu di mana izinnya putus

`namei -l` memecah path menjadi tiap komponen lengkap dengan owner, grup, dan mode:

```bash
# di server
namei -l /srv/tokoku/uploads/foto.jpg
```

Keluarannya kira-kira seperti ini (contoh ilustrasi, bukan hasil dari servermu):

```text
f: /srv/tokoku/uploads/foto.jpg
dr-xr-xr-x root   root   /
drwxr-xr-x root   root   srv
drwx------ root   root   tokoku
drwxr-x--- tokoku www-data uploads
```

Baris `tokoku` di contoh itu `drwx------`: others tidak punya `x`, jadi `www-data` mentok di sana walaupun `uploads` terbuka. Baca dari atas ke bawah dan cari komponen pertama yang tidak memberi `x` (atau `r` di file akhir) kepada user yang gagal.

Cari kode yang bisa ditulis akun runtime, termasuk izin lewat grup dan ACL:

```bash
# di server
sudo -u tokoku find /srv/tokoku/app -writable -print
```

Periksa setiap hasil dan pesan penolakan akses. Hasil kosong hanya berguna jika seluruh direktori berhasil ditelusuri. Jangan jalankan `chown -R` atau `chmod -R` pada seluruh `/srv/tokoku`.

### Ubah hanya path yang perlu

Folder uploads: dimiliki user runtime, grup `www-data` supaya Nginx bisa membaca, bit setgid (`2` di depan) supaya file baru mewarisi grup itu.

```bash
# di server
sudo install -d -o tokoku -g www-data -m 2750 /srv/tokoku/uploads
```

`install -d` membuat folder kalau belum ada, atau menyetel owner dan mode kalau sudah ada, tanpa menyentuh isi di dalamnya. File lama di dalam `uploads` tidak berubah. Kalau memang perlu diperbaiki, daftar dulu lalu perbaiki yang salah saja:

Setgid hanya mengatur pewarisan grup; aplikasi juga harus membuat berkas dengan izin baca grup, misalnya mode `640` dengan umask `0027`. Periksa satu unggahan baru. Jika memakai Nginx untuk menyajikan unggahan, jangan mengeksekusi berkas unggahan sebagai PHP atau skrip lain.

```bash
# di server
sudo find /srv/tokoku/uploads ! -user tokoku -print
sudo find /srv/tokoku/uploads -type f ! -perm -g=r -print
```

Folder induk yang menghalangi (hasil `namei`), dengan izin seminimal mungkin:

```bash
# di server: others hanya boleh melintas, tidak boleh mendaftar isinya
sudo chmod o+x /srv/tokoku
```

Kode, hanya untuk komponen yang ternyata salah dari hasil `find` di atas, contoh satu file:

```bash
# di server
sudo chown root:root /srv/tokoku/app/server.js
sudo chmod 644 /srv/tokoku/app/server.js
```

### Buktikan dengan akun yang sama dengan aplikasi

Jangan mengetes dengan akun admin: ia bisa `sudo` dan lolos di tempat yang membuat aplikasi gagal. Jalankan tes sebagai user runtime:

```bash
# di server: harus berhasil (baca kode, tulis ke uploads)
sudo -u tokoku test -r /srv/tokoku/app/server.js && echo "kode terbaca"
sudo -u tokoku touch /srv/tokoku/uploads/.probe && echo "uploads bisa ditulis"
sudo -u tokoku rm /srv/tokoku/uploads/.probe

# di server: harus gagal (kode tidak boleh bisa ditulis)
sudo -u tokoku test -w /srv/tokoku/app/server.js || echo "benar: kode tidak bisa ditulis"

# di server: pembaca web server harus bisa melihat file di uploads
sudo -u www-data test -r /srv/tokoku/uploads/foto.jpg && echo "www-data bisa baca"
```

Tes terakhir hanya relevan kalau Nginx langsung menyajikan folder `uploads`. Kalau semua baris sesuai harapan, coba unggah dari aplikasinya sendiri.

## Rahasia jangan di bawah root web

Berkas seperti `.env` yang ditaruh di dalam folder yang dilayani web server bisa terunduh lewat URL kalau konfigurasi server meleset sedikit saja. Pindahkan keluar dari root web:

```bash
# di server
sudo install -d -o root -g tokoku -m 750 /etc/tokoku
sudo test -e /etc/tokoku/app.env || sudo install -o root -g tokoku -m 640 /dev/null /etc/tokoku/app.env
sudoedit /etc/tokoku/app.env
```

Perintah bersyarat itu hanya membuat berkas kosong jika belum ada; jangan menimpa berkas rahasia yang sudah berisi data. Kalau sudah ada, periksa pemilik dan izinnya lalu sesuaikan dengan `chown root:tokoku` dan `chmod 640` pada berkas tersebut.

Di unit systemd, arahkan dengan `EnvironmentFile=/etc/tokoku/app.env`. Menurut `systemd.exec(5)`, file itu dibaca oleh manajer systemd, bukan oleh proses aplikasinya, jadi untuk pola ini `root:root` dengan mode `600` juga cukup. Pakai `root:tokoku 640` kalau aplikasimu membaca berkas itu sendiri.

Kalau rahasia sempat berada di folder publik atau masuk repositori, memindahkannya belum cukup. Anggap sudah bocor dan ganti nilainya (kata sandi basis data, token).

## Kalau mode sudah benar tapi tetap ditolak

Setelah `namei` dan tes `sudo -u` menunjukkan izin Unix beres, cari lapisan lain:

Kalau `getfacl` belum tersedia, pasang paket `acl` dengan `sudo apt install acl`.

```bash
# di server: ACL tambahan? Tanda + di ujung mode, atau getfacl
ls -ld /srv/tokoku/uploads
getfacl /srv/tokoku/uploads

# di server: filesystem dipasang read-only atau noexec?
findmnt -T /srv/tokoku/uploads

# di server: atribut khusus (misalnya immutable, huruf i)
lsattr -d /srv/tokoku/uploads

# di server: pembatas bawaan unit systemd
systemctl cat tokoku.service
```

Di keluaran `systemctl cat`, cari `ProtectSystem=`, `ProtectHome=`, `ReadOnlyPaths=`, dan `ReadWritePaths=`. Dengan `ProtectSystem=strict`, seluruh hierarki file menjadi hanya-baca bagi layanan, kecuali path yang disebut di `ReadWritePaths=`. Kamu bisa saja melihat mode `750` dan owner benar, tetapi unit tetap tidak bisa menulis karena path itu belum dibuka:

```bash
# di server
sudo systemctl edit tokoku.service
```

```ini
[Service]
ReadWritePaths=/srv/tokoku/uploads
```

Simpan, lalu `sudo systemctl restart tokoku.service` dan ulangi unggahan. Isi lain dari `ProtectSystem` hanya kamu ubah kalau sudah tahu aplikasimu butuh tulis ke mana lagi. Kalau AppArmor aktif, pesan penolakannya muncul di `sudo journalctl -k | grep -i apparmor`.

Setelah semua bekerja, tutup dengan satu pemeriksaan terakhir: tidak ada yang bisa ditulis siapa saja.

```bash
# di server
sudo find /srv/tokoku -perm -o+w ! -type l -print
```

Hasil kosong berarti tidak ada file atau folder di bawah path itu yang dapat ditulis oleh others.

## Referensi

- [chmod(1), Debian trixie](https://manpages.debian.org/trixie/coreutils/chmod.1.en.html)
- [namei(1), Debian trixie](https://manpages.debian.org/trixie/util-linux/namei.1.en.html)
- [install(1), Debian trixie](https://manpages.debian.org/trixie/coreutils/install.1.en.html)
- [adduser(8), Debian trixie](https://manpages.debian.org/trixie/adduser/adduser.8.en.html)
- [getfacl(1), Debian trixie](https://manpages.debian.org/trixie/acl/getfacl.1.en.html)
- [systemd.exec(5): EnvironmentFile, ProtectSystem, ReadWritePaths](https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html)

## Seri keamanan server Debian

1. [Langkah awal mengamankan server Debian 13](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai key di Debian 13](/posts/debian-ssh-key/)
3. [Firewall sederhana dengan UFW di Debian 13](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka di server Debian 13](/posts/debian-cek-port/)
5. [Update keamanan otomatis di Debian 13 dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. **Permission file di Debian 13 tanpa chmod 777**
7. [Fail2ban untuk SSH di Debian 13](/posts/debian-fail2ban-ssh/)
8. [Backup dan restore server Debian 13 dengan restic](/posts/debian-backup-restore/)
