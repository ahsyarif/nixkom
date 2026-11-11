---
title: "Fail2ban untuk SSH di Debian 13: backend systemd dan jail sshd"
date: 2026-11-11T21:06:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "fail2ban", "ssh"]
description: "Pasang Fail2ban untuk SSH Debian 13: baca journal, atur jail systemd, periksa pemblokiran, dan siapkan akses pemulihan lewat konsol."
---

Fail2ban membaca kegagalan login SSH di log Debian, menghitungnya per alamat IP, lalu memasang blokir sementara lewat firewall. Untuk Debian 13 (*trixie*) yang mencatat log ke journal systemd, pilih backend `systemd` agar tidak bergantung pada `/var/log/auth.log`.

Panduan ini ditulis dari dokumentasi dan sumber paket Debian, bukan dari hasil uji di servermu. Perintah berlabel **di server** dijalankan lewat akun admin dengan `sudo`. Alamat contoh `192.0.2.55` dan `198.51.100.7` berasal dari rentang dokumentasi; ganti `198.51.100.7` dengan IP publik tempat kamu biasa login.

Satu hal dulu: fail2ban bukan pengganti login pakai key. Kalau `PasswordAuthentication no` sudah aktif dan hanya key yang diterima, tebakan kata sandi tidak akan pernah berhasil, sehingga fail2ban lebih berfungsi mengurangi sampah log dan beban koneksi. Selesaikan [login SSH pakai key](/posts/debian-ssh-key/) dulu bila belum.

## Baca log SSH dari journal

Di instalasi Debian minimal, `/var/log/auth.log` bisa tidak ada karena `rsyslog` tidak ikut terpasang. Layanan SSH di Debian bernama `ssh` (bukan `sshd`), dan lognya masuk journal:

```bash
# di server
ls -l /var/log/auth.log                  # mungkin: No such file or directory
sudo journalctl -u ssh -n 50 --no-pager
sudo journalctl -u ssh --since "1 hour ago" --no-pager | grep -E 'Failed|Invalid user'
```

Lihat juga bagaimana proses SSH menandai log-nya, karena ini menentukan filter di bawah:

```bash
# di server
sudo journalctl -u ssh -n 1 -o verbose --no-pager | grep -E 'SYSLOG_IDENTIFIER|_COMM|_SYSTEMD_UNIT'
```

Perhatikan nilai `_COMM` dan `SYSLOG_IDENTIFIER`. Pada OpenSSH versi baru, proses per sesi bernama `sshd-session`, bukan `sshd`. Changelog paket fail2ban Debian 1.1.0-6 dan 1.1.0-8 memang menyebut penyesuaian untuk OpenSSH 9.8 dan 10.0. Filter `sshd` bawaan paket 1.1.0-8 sudah memuat `_COMM=sshd` dan `_COMM=sshd-session`, tetapi berkas jail bawaan Debian (`jail.d/defaults-debian.conf`) menyetel `journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd` di level jail, dan setelan di level jail lebih spesifik daripada setelan filter. Saya tidak bisa memastikan dari sini apakah itu membuat login gagal di servermu terlewat, jadi jangan percaya begitu saja: kamu akan mengecek dan menyetelnya sendiri di langkah berikut.

## Pasang fail2ban

```bash
# di server
sudo apt update
sudo apt install fail2ban
systemctl is-active fail2ban
```

Berkas bawaan paket Debian, `/etc/fail2ban/jail.d/defaults-debian.conf` (dari sumber paket 1.1.0-8), sudah mengaktifkan jail `sshd` dengan backend systemd dan memakai `nftables` sebagai aksi pemblokir:

```ini
[DEFAULT]
banaction = nftables
banaction_allports = nftables[type=allports]

[sshd]
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd
enabled = true
```

Berkas `.conf` jangan diedit. Manual `jail.conf(5)` menganjurkan menaruh perubahan di berkas `.local`, yang dibaca belakangan dan menimpa `.conf`. Urutan bacanya: `jail.conf`, `jail.d/*.conf`, `jail.local`, `jail.d/*.local`. Dengan begitu pembaruan paket tidak membuat perubahanmu hilang.

## Buat jail.local khusus SSH

Cari dulu port SSH yang sebenarnya dipakai, jangan mengira 22:

```bash
# di server
sudo sshd -T | grep -E '^port '
```

Buat berkas override di `jail.d`:

```bash
# di server
sudoedit /etc/fail2ban/jail.d/sshd.local
```

```ini
[DEFAULT]
# IP yang tidak boleh diblokir: loopback dan alamat tempat kamu login.
# Ganti 198.51.100.7 dengan IP publikmu; pisahkan dengan spasi untuk lebih dari satu.
ignoreip = 127.0.0.1/8 ::1 198.51.100.7

[sshd]
enabled = true
backend = systemd
port    = ssh
# Cocok dengan proses lama (sshd) dan proses sesi baru (sshd-session)
journalmatch = _SYSTEMD_UNIT=ssh.service
# Contoh angka awal, bukan jaminan: 5 gagal dalam 10 menit = blokir 1 jam
maxretry = 5
findtime = 10m
bantime  = 1h
```

Beberapa catatan atas isinya:

- **`port`:** `ssh` berarti port 22 lewat `/etc/services`. Kalau `sshd -T` menunjukkan port lain, mis. 2222, tulis `port = 2222`. Port yang salah membuat jail tampak aktif tetapi memblokir port yang tidak kamu pakai.
- **`journalmatch`:** hanya menyaring berdasarkan unit `ssh.service`, jadi proses `sshd` maupun `sshd-session` ikut terbaca. Regex filter `sshd` tetap menentukan baris mana yang dihitung sebagai kegagalan.
- **Tidak ada `logpath`:** dengan backend `systemd`, fail2ban membaca journal, bukan berkas. Jangan menambahkan `logpath = /var/log/auth.log`.
- **`maxretry`, `findtime`, `bantime`:** angka di atas contoh awal yang masuk akal untuk mulai. Manual `jail.conf(5)` mendefinisikannya begini: `maxretry` adalah jumlah kegagalan dalam `findtime` terakhir sebelum IP diblokir. Naikkan `maxretry` kalau kamu atau timmu sering salah ketik; naikkan `bantime` kalau serangan berulang.
- **`ignoreip`:** daftar IP yang tidak pernah diblokir. Alamat rumah atau kantor yang berubah-ubah (IP dinamis) tidak bisa diandalkan di sini; itu alasan lain untuk punya akses konsol.

## Uji konfigurasi sebelum menyalakan ulang

Siapkan dulu jalan keluar. **Jangan tutup sesi SSH yang sedang aktif** selama langkah ini, dan pastikan kamu bisa membuka konsol dari panel penyedia hosting (VNC/serial/rescue). Kalau ada salah setel yang memblokir IP-mu, konsol adalah satu-satunya jalan masuk yang tidak lewat jaringan.

```bash
# di server
sudo fail2ban-client -t
```

Perintah `-t` (`--test`) hanya menguji konfigurasi; keluarannya menyebut konfigurasi OK kalau valid. Kalau ada galat, perbaiki dulu dan jangan lanjut. Setelah lolos, jalankan ulang layanan dan pastikan hidup saat boot:

```bash
# di server
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
systemctl is-active fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Pada keluaran `status sshd`, periksa:

- `Journal matches:` memuat `_SYSTEMD_UNIT=ssh.service` (bukan yang lama dengan `_COMM=sshd`), tanda `journalmatch`-mu terbaca;
- `Currently failed` dan `Total failed` berupa angka; `Banned IP list` kosong sampai ada yang diblokir.

Cek juga bahwa filter sungguh mengenali baris di journal. Perintah ini membaca journal dan menghitung baris yang cocok, tanpa memblokir siapa pun:

```bash
# di server
sudo fail2ban-regex systemd-journal sshd -m "_SYSTEMD_UNIT=ssh.service"
```

Lihat ringkasan "Lines: ... lines, ... matched". Kalau ada percobaan gagal login di journal tetapi jumlah matched nol, filter belum cocok dengan log di mesinmu dan jail tidak akan memblokir apa pun. Hasil nol juga wajar kalau memang belum ada kegagalan di journal.

Aksi nftables dapat membuat aturan saat blokir pertama terjadi. Jadi keluaran kosong sebelum ada blokir belum berarti jail rusak. Setelah uji blokir manual di bagian berikut, cari aturan `f2b` saat blokir masih aktif:

```bash
# di server
sudo nft list ruleset | grep -i f2b
```

## Lihat log, ban, dan unban

Log fail2ban sendiri:

```bash
# di server
sudo journalctl -u fail2ban -n 50 --no-pager
sudo fail2ban-client get logtarget      # kalau berupa berkas, baca berkas itu
```

Cara mencoba blokir tanpa mengunci dirimu: pakai alamat dokumentasi yang bukan milikmu, jangan alamatmu sendiri.

```bash
# di server: blokir manual alamat contoh, cek, lalu lepas lagi
sudo fail2ban-client set sshd banip 192.0.2.55
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 192.0.2.55
sudo fail2ban-client status sshd
```

Kalau IP-mu sendiri terblokir (dan konsol sudah siap):

```bash
# di server, lewat konsol penyedia atau sesi SSH yang tersisa
sudo fail2ban-client set sshd unbanip 198.51.100.7
# lepas satu IP dari semua jail (tanpa argumen, perintah unban melepas SEMUA blokir)
sudo fail2ban-client unban 198.51.100.7
```

Untuk benar-benar mensimulasikan serangan, jangan menembak servermu dari laptop yang kamu pakai untuk login. Ban yang kamu picu atas dirimu sendiri adalah kesalahan yang paling sering terjadi.

## Batas yang perlu kamu ketahui

- **Serangan terdistribusi:** fail2ban menghitung per IP. Penyerang yang memakai ratusan IP dan mencoba satu-dua kali dari tiap IP tidak melewati `maxretry`, jadi tidak terblokir. Pertahanan utamanya tetap login pakai key dan `PasswordAuthentication no`.
- **Angka di atas bukan jaminan:** lima kali dalam sepuluh menit adalah titik awal. Sesuaikan dengan pola logmu.
- **Blokir sementara:** setelah `bantime` habis, IP yang sama bisa mencoba lagi dan dihitung dari nol. Riwayat blokir disimpan di basis data fail2ban dan dibersihkan berdasarkan `dbpurgeage` (bawaan 24 jam, di `fail2ban.conf`), jadi jangan mengandalkannya sebagai daftar hitam permanen.
- **Firewall tetap perlu:** fail2ban menambah aturan di atas firewall, tidak menggantikannya.

Pantau status jail dan log setelah penerapan. Periksa apakah kegagalan login terbaca, blokir benar-benar muncul pada firewall, dan login admin baru tetap berhasil; daftar IP terblokir saja belum membuktikan seluruh alur bekerja.

## Referensi

- [jail.conf(5), fail2ban 1.1.0-8 di Debian trixie](https://manpages.debian.org/trixie/fail2ban/jail.conf.5.en.html)
- [fail2ban-client(1), Debian trixie](https://manpages.debian.org/trixie/fail2ban/fail2ban-client.1.en.html)
- [fail2ban-regex(1), Debian trixie](https://manpages.debian.org/trixie/fail2ban/fail2ban-regex.1.en.html)
- [Berkas jail.d/defaults-debian.conf, paket fail2ban 1.1.0-8](https://sources.debian.org/data/main/f/fail2ban/1.1.0-8/debian/debian-files/jail.d_defaults-debian.conf)
- [Changelog paket fail2ban Debian 1.1.0-8](https://sources.debian.org/data/main/f/fail2ban/1.1.0-8/debian/changelog)
- [journalctl(1), Debian trixie](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)

## Seri keamanan server Debian

1. [Langkah awal mengamankan server Debian 13](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai key di Debian 13](/posts/debian-ssh-key/)
3. [Firewall sederhana dengan UFW di Debian 13](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka di server Debian 13](/posts/debian-cek-port/)
5. [Update keamanan otomatis di Debian 13 dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission file di Debian 13 tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. **Fail2ban untuk SSH di Debian 13**
8. [Backup dan restore server Debian 13 dengan restic](/posts/debian-backup-restore/)
