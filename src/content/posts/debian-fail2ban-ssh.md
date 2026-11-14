---
title: "Fail2ban untuk SSH di Debian 13: backend systemd dan jail sshd"
date: 2026-11-11T21:06:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "fail2ban", "ssh"]
description: "Pasang Fail2ban untuk SSH Debian 13: baca journal, atur jail systemd, periksa pemblokiran, dan siapkan akses pemulihan lewat konsol."
---

Bayangkan servermu itu sebuah rumah, dan pintu masuk utamanya adalah SSH. Di internet, selalu ada bot otomatis yang berkeliling mencoba mengetuk pintu dan menebak-nebak password secara acak. **Fail2ban** bekerja seperti **satpam**: ia mengawasi catatan tamu yang gagal masuk, menghitung berapa kali mereka salah ketik "PIN" dari alamat IP yang sama, lalu memblokir sementara IP tersebut lewat firewall.

Di Debian 13 (*trixie*), catatan aktivitas sistem (log) disimpan di **journal systemd**, bukan lagi selalu berupa file teks `/var/log/auth.log`. Karena itu, kita memilih backend `systemd` agar Fail2ban membaca catatan langsung dari sumbernya.

Panduan ini disusun dari dokumentasi dan paket resmi Debian, bukan dari hasil uji langsung di servermu. Perintah berlabel **di server** dijalankan memakai akun admin dengan `sudo`. Alamat IP contoh `192.0.2.55` dan `198.51.100.7` adalah IP khusus dokumentasi; ganti `198.51.100.7` dengan IP publik tempat kamu biasa login.

Satu hal penting sebelum mulai: Fail2ban **bukan** pengganti login pakai SSH key. Kalau `PasswordAuthentication no` sudah aktif dan hanya kunci SSH yang diterima, tebakan password tidak akan pernah berhasil menembus servermu. Dalam kondisi itu, tugas Fail2ban lebih ke arah mengusir pengganggu agar log tidak penuh sampah dan server tidak lelah meladeni ketukan pintu. Jika belum, selesaikan dulu panduan [login SSH pakai key](/posts/debian-ssh-key/).

## Baca log SSH dari journal

Sebelum memasang satpam, kita perlu tahu dulu di mana catatan keluar-masuk pintu SSH disimpan dan seperti apa bentuk tulisannya. Pada instalasi Debian minimal, file `/var/log/auth.log` sering kali tidak ada karena paket pencatat log tradisional (`rsyslog`) tidak ikut terpasang. Selain itu, nama layanan SSH di Debian adalah `ssh` (bukan `sshd`), dan log-nya masuk ke journal systemd:

```bash
# di server
ls -l /var/log/auth.log                  # wajar jika muncul: No such file or directory
sudo journalctl -u ssh -n 50 --no-pager
sudo journalctl -u ssh --since "1 hour ago" --no-pager | grep -E 'Failed|Invalid user'
```

Arti opsi perintah di atas:
- `-u ssh`: hanya menampilkan catatan milik layanan (`unit`) `ssh`.
- `-n 50`: ambil 50 baris terakhir saja.
- `--no-pager`: tampilkan langsung di layar tanpa masuk ke mode gulir (`less`).
- `--since "1 hour ago"`: saring catatan selama 1 jam terakhir, lalu `grep -E 'Failed|Invalid user'` mencari baris yang berisi kegagalan login atau nama user yang tidak dikenal.

Selanjutnya, intip bagaimana proses SSH memberi label pada log-nya. Informasi ini penting untuk menentukan aturan filter nanti:

```bash
# di server
sudo journalctl -u ssh -n 1 -o verbose --no-pager | grep -E 'SYSLOG_IDENTIFIER|_COMM|_SYSTEMD_UNIT'
```

Opsi `-o verbose` menampilkan rincian lengkap sebuah baris log. Perhatikan nilai `_COMM` dan `SYSLOG_IDENTIFIER`. Pada OpenSSH versi baru, proses yang menangani tiap sesi login bernama `sshd-session`, bukan lagi `sshd`. Changelog paket fail2ban Debian `1.1.0-6` dan `1.1.0-8` memang sudah menyesuaikan filter bawaan agar mengenali `_COMM=sshd` maupun `_COMM=sshd-session`. Namun, berkas pengaturan bawaan Debian (`jail.d/defaults-debian.conf`) masih menyetel `journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd` di level *jail* (yang sifatnya menimpa aturan filter). Supaya log `sshd-session` tidak sampai terlewat di servermu, kita tidak akan menebak-nebak—kita akan mengecek dan menyetelnya sendiri di langkah berikutnya.

## Pasang fail2ban

Sekarang kita perbarui daftar paket, pasang Fail2ban, lalu pastikan layanannya langsung menyala:

```bash
# di server
sudo apt update
sudo apt install fail2ban
systemctl is-active fail2ban
```

Secara bawaan, Debian menyertakan berkas `/etc/fail2ban/jail.d/defaults-debian.conf` (dari sumber paket `1.1.0-8`) yang sudah menyalakan penjagaan (*jail*) untuk `sshd` menggunakan backend `systemd` dan firewall `nftables`:

```ini
[DEFAULT]
banaction = nftables
banaction_allports = nftables[type=allports]

[sshd]
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd
enabled = true
```

**Aturan penting:** jangan pernah mengedit berkas `.conf` bawaan secara langsung. Anggap saja `.conf` itu buku panduan asli dari pabrik—kalau nanti ada pembaruan paket, isinya bisa tertimpa dan perubahanmu hilang. Manual `jail.conf(5)` menganjurkan untuk menaruh semua penyesuaian di berkas `.local`, yang dibaca belakangan dan otomatis menimpa isi `.conf`. Urutan bacanya adalah: `jail.conf`, `jail.d/*.conf`, `jail.local`, lalu `jail.d/*.local`.

## Buat jail.local khusus SSH

Sebelum menulis aturan untuk satpam, pastikan dulu pintu mana yang sebenarnya dipakai untuk SSH. Jangan langsung mengira port-nya 22, cek langsung dari konfigurasi SSH yang aktif:

```bash
# di server
sudo sshd -T | grep -E '^port '
```

Perintah `sshd -T` mencetak konfigurasi SSH yang sedang berlaku, lalu `grep` mengambil baris `port`-nya saja. Setelah tahu port-nya, buat berkas penyesuaian baru di `jail.d` menggunakan `sudoedit` (cara aman mengedit file sistem sebagai admin):

```bash
# di server
sudoedit /etc/fail2ban/jail.d/sshd.local
```

Masukkan isi berikut:

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

Penjelasan singkat tiap barisnya:

- **`ignoreip`:** Daftar IP "penghuni rumah" yang tidak akan pernah diblokir (`127.0.0.1/8` dan `::1` adalah alamat lokal server itu sendiri, ditambah IP publikmu). Perlu diingat, IP internet rumah atau kantor sering berubah-ubah (dinamis). Karena itu, jangan hanya mengandalkan `ignoreip`—pastikan kamu selalu punya akses konsol darurat.
- **`enabled = true`:** Mengaktifkan penjagaan (*jail*) untuk SSH.
- **`backend = systemd`:** Mengarahkan Fail2ban membaca journal systemd, bukan file log teks. Karena itu, **jangan** menambahkan `logpath = /var/log/auth.log`.
- **`port`:** Nilai `ssh` otomatis merujuk ke port 22 (sesuai daftar `/etc/services`). Jika hasil `sshd -T` tadi menunjukkan port lain (misalnya `2222`), ubah menjadi `port = 2222`. Port yang keliru membuat Fail2ban tampak aktif, padahal ia menjaga pintu yang salah.
- **`journalmatch`:** Dengan hanya menulis `_SYSTEMD_UNIT=ssh.service`, semua log dari layanan SSH—baik proses `sshd` lama maupun `sshd-session` baru—ikut terbaca. Pola teks mana yang dianggap "gagal login" tetap ditentukan oleh filter `sshd`.
- **`maxretry`, `findtime`, `bantime`:** Ini aturan main satpamnya. Contoh di atas berarti: jika ada IP yang gagal login `5` kali (`maxretry`) dalam rentang `10 menit` terakhir (`findtime`), blokir IP tersebut selama `1 jam` (`bantime`). Angka ini titik awal yang wajar; naikkan `maxretry` kalau kamu atau timmu sering salah ketik, atau naikkan `bantime` jika serangan terus berulang.

## Uji konfigurasi sebelum menyalakan ulang

Sebelum menerapkan aturan baru, siapkan dulu jalan keluar darurat. **Jangan tutup sesi SSH yang sedang aktif** selama langkah ini, dan pastikan kamu bisa membuka **konsol** dari panel penyedia hosting (VNC/serial/rescue). Jika ada salah setel yang membuat IP-mu sendiri terblokir, konsol adalah satu-satunya pintu masuk yang tidak lewat jaringan SSH.

Pertama, uji apakah penulisan konfigurasi kita valid tanpa langsung menjalankannya:

```bash
# di server
sudo fail2ban-client -t
```

Opsi `-t` (`--test`) hanya mengecek sintaks. Jika muncul keterangan konfigurasi OK, baru lanjut menyalakan layanan agar otomatis jalan saat server boot (`enable`), memuat ulang aturan (`restart`), dan memeriksa statusnya:

```bash
# di server
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
systemctl is-active fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Pada keluaran `status sshd`, periksa tiga hal ini:
- `Journal matches:` sudah menampilkan `_SYSTEMD_UNIT=ssh.service` (bukan lagi yang lama dengan `_COMM=sshd`), tanda file `.local` milikmu terbaca.
- `Currently failed` dan `Total failed` menampilkan angka.
- `Banned IP list` masih kosong sampai ada IP yang benar-benar diblokir.

Selanjutnya, pastikan "kacamata" filter Fail2ban sungguh mengenali baris gagal login di journal servermu. Perintah berikut hanya membaca dan mencocokkan log tanpa memblokir siapa pun:

```bash
# di server
sudo fail2ban-regex systemd-journal sshd -m "_SYSTEMD_UNIT=ssh.service"
```

Lihat ringkasan `"Lines: ... lines, ... matched"`. Kalau kamu tahu di journal ada percobaan gagal login tetapi jumlah *matched* bernilai nol, artinya filter belum cocok dengan format log di mesinmu dan penjagaan tidak akan memblokir apa pun. Namun jika memang belum ada percobaan gagal login sama sekali di journal, hasil nol adalah hal yang wajar.

Terakhir, perlu diketahui bahwa aturan firewall `nftables` milik Fail2ban baru dibuat ketika pemblokiran pertama terjadi. Jadi kalau daftar aturannya masih kosong sebelum ada yang diblokir, itu bukan tanda rusak. Setelah mencoba blokir manual di bagian berikut, kamu bisa mengecek aturan `f2b` saat blokir sedang aktif:

```bash
# di server
sudo nft list ruleset | grep -i f2b
```

## Lihat log, ban, dan unban

Untuk melihat catatan kerja Fail2ban sendiri (siapa yang baru diblokir atau dilepas):

```bash
# di server
sudo journalctl -u fail2ban -n 50 --no-pager
sudo fail2ban-client get logtarget      # jika hasilnya berupa path berkas, baca berkas tersebut
```

Untuk mengetes apakah mekanisme blokir berjalan, **jangan** gunakan IP milikmu sendiri. Pakai saja alamat IP khusus dokumentasi seperti `192.0.2.55` untuk simulasi blokir lalu lepas lagi:

```bash
# di server: blokir manual alamat contoh, cek statusnya, lalu lepas lagi
sudo fail2ban-client set sshd banip 192.0.2.55
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 192.0.2.55
sudo fail2ban-client status sshd
```

Jika suatu saat IP-mu sendiri tidak sengaja terblokir (dan akses konsol sudah siap), buka blokirnya lewat konsol atau sesi SSH yang masih tersisa:

```bash
# di server, lewat konsol penyedia atau sesi SSH yang masih terbuka
sudo fail2ban-client set sshd unbanip 198.51.100.7
# atau lepas satu IP dari semua jail sekaligus (hati-hati: unban tanpa argumen melepas SEMUA blokir)
sudo fail2ban-client unban 198.51.100.7
```

Jika ingin benar-benar mensimulasikan serangan gagal login, jangan menembak server dari laptop yang sedang kamu pakai untuk login. Mengunci diri sendiri adalah kesalahan yang paling sering terjadi saat baru belajar Fail2ban.

## Batas yang perlu kamu ketahui

Satpam Fail2ban sangat membantu, tetapi ia punya keterbatasan:

- **Serangan terdistribusi:** Fail2ban menghitung kegagalan per alamat IP. Jika penyerang memakai ratusan IP berbeda dan hanya mencoba satu atau dua kali dari tiap IP, batas `maxretry` tidak akan terlewati sehingga tidak ada yang diblokir. Karena itu, pertahanan utamanya tetap login memakai SSH key dan mematikan password (`PasswordAuthentication no`).
- **Angka contoh bukan jaminan:** Batas 5 kali dalam 10 menit hanyalah titik awal. Pantau pola log servermu dan sesuaikan bila perlu.
- **Blokir bersifat sementara:** Begitu durasi `bantime` habis, IP yang sama bisa mencoba lagi dan hitungannya mulai dari nol. Riwayat blokir di basis data Fail2ban juga dibersihkan otomatis sesuai `dbpurgeage` (bawaannya 24 jam di `fail2ban.conf`), jadi jangan mengandalkannya sebagai daftar hitam permanen.
- **Firewall tetap wajib:** Fail2ban hanya menumpang menambah aturan blokir sementara di atas firewall, bukan menggantikan fungsi firewall utama.

Setelah semuanya terpasang, pantau status jail dan log secara berkala. Pastikan kegagalan login benar-benar terbaca, aturan blokir muncul di firewall saat ada pelanggaran, dan akun admin tetap bisa login dengan normal—daftar IP terblokir saja belum membuktikan seluruh alur bekerja mulus.

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
