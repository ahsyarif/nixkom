---
title: "Firewall UFW di Debian 13: aktifkan tanpa mengunci diri sendiri"
date: 2026-11-11T21:02:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ufw", "firewall"]
description: "Pasang UFW di Debian 13: cek port SSH asli, izinkan sebelum enable, uji sesi baru, dan tahu batas firewall saat memakai Docker."
---

Bayangkan servermu adalah sebuah rumah dengan banyak pintu dan jendela bernomor (disebut **port**). **Firewall** bertugas menjadi satpam di depan pintu: menentukan siapa yang boleh masuk, lewat pintu nomor berapa, dan mana yang harus langsung ditolak.

Di Debian, ada alat bernama **UFW** (*Uncomplicated Firewall*) yang membuat pengaturan firewall Linux jauh lebih ramah untuk pemula dibandingkan menulis aturan jaringan yang rumit secara manual.

Namun, ada satu kesalahan paling klasik yang sering dialami pemula: menyalakan UFW *sebelum* mengizinkan pintu SSH. Akibatnya, begitu UFW menyala, koneksi SSH langsung putus dan kamu terkunci di luar servermu sendiri! Artikel ini akan memandumu mengaktifkan UFW dengan urutan yang aman.

**Prasyarat:** Akun `admin` dengan hak `sudo` sudah aktif (dari [artikel pembuka seri](/posts/debian-server-keamanan-awal/)), dan kamu sudah tahu cara membuka **konsol recovery** di panel penyedia VPS sebagai jalan darurat. Angka `203.0.113.10` di bawah adalah IP contoh; **ganti dengan IP servermu**.

## 1. Pasang UFW dan cek kondisi awal

Pertama, perbarui daftar paket, pasang UFW, lalu cek apakah ia sudah menyala atau belum:

```bash
# di server
sudo apt update
sudo apt install ufw
sudo ufw status verbose
```

Pada server baru yang belum pernah memakai UFW, keluarannya adalah `Status: inactive`.

> **Hati-hati:** Jika statusnya ternyata sudah `active`, **berhenti dulu** sebelum mengubah aturan apa pun! Catat dulu semua aturan yang ada dan layanan apa saja yang sedang berjalan agar tidak memutus akses layanan lain.

Selain itu, status `inactive` pada UFW **tidak berarti** servermu benar-benar kosong tanpa firewall lain. Bisa jadi penyedia cloud atau aplikasi lain sudah memasang aturan jaringan lewat `iptables` atau `nftables`. Mari periksa kondisinya:

```bash
# di server
sudo ufw show added
sudo iptables -S
sudo nft list ruleset
```

Arti perintah-perintah di atas:
- `ufw show added`: melihat daftar aturan UFW yang sudah sempat ditambahkan (meski UFW belum dinyalakan).
- `iptables -S` dan `nft list ruleset`: mengintip aturan firewall Linux di level sistem. Pada Debian 13, `iptables` biasanya memakai sistem `nftables` di balik layar.

Jika salah satu perintah di atas tidak tersedia, periksa dengan alat firewall yang terpasang; jangan langsung menganggap aturan kosong. Jangan juga mencampur UFW dengan pengelola firewall lain secara bersamaan tanpa memahami aturan mana yang dikelola oleh masing-masing alat.

## 2. Pastikan port SSH yang sebenarnya

Jangan menebak bahwa SSH pasti berjalan di port `22`. Bisa saja servermu memakai port lain (misalnya `2222`). Cek langsung dari sistem yang aktif:

```bash
# di server
sudo ss -ltnp | grep sshd
sudo sshd -T | grep -i '^port'
```

- `ss -ltnp` melihat program apa yang sedang "mendengarkan" koneksi TCP di server, lalu `grep sshd` menyaring baris milik SSH.
- `sshd -T` mencetak konfigurasi SSH yang benar-benar dipakai server.

Pada pengaturan bawaan Debian, hasilnya adalah `0.0.0.0:22`, `[::]:22`, serta `port 22`. Jika di servermu angkanya berbeda, gunakan angka port milikmu di semua perintah pada langkah berikutnya. Cara membaca keluaran `ss` dibahas lebih lengkap di [artikel cek port](/posts/debian-cek-port/).

## 3. Izinkan SSH dulu, baru nyalakan firewall

Aturan dasar firewall yang aman adalah: **tolak semua koneksi masuk dari luar** secara bawaan (`deny incoming`), tetapi **izinkan semua koneksi keluar dari server** (`allow outgoing`) supaya server tetap bisa mengunduh update. Setelah itu, baru kita buka pintu khusus untuk SSH:

```bash
# di server
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
```

Menjalankan `allow 22/tcp` di UFW otomatis membuat aturan untuk alamat IPv4 maupun IPv6 sekaligus, selama dukungan IPv6 aktif di file `/etc/default/ufw` (`IPV6=yes`, yang merupakan bawaan Debian). Pastikan dengan dua perintah ini:

```bash
# di server
grep ^IPV6 /etc/default/ufw
sudo ufw show added
```

**Ingin lebih ketat?** Kalau kamu punya alamat IP publik tetap (IP statis, misalnya IP VPN atau kantor), kamu bisa membatasi agar pintu SSH hanya mau dibuka jika diketuk dari IP tersebut saja:

```bash
# ganti 198.51.100.7 dengan IP publik tetapmu
sudo ufw allow from 198.51.100.7 to any port 22 proto tcp
```

> **Peringatan untuk pemula:** IP internet rumah atau Wi-Fi biasa sering berubah-ubah (dinamis). Kalau IP rumahmu besok berubah, aturan ini bisa menguncimu! Jadi kalau tidak yakin apakah IP-mu tetap, lewati pembatasan IP ini dan cukup pakai `allow 22/tcp` biasa.

Selain itu, perlu diketahui bahwa menambah aturan khusus satu IP **tidak otomatis menghapus** aturan `allow 22/tcp` umum yang sudah dibuat sebelumnya—keduanya bersifat saling menambah. Jika ingin beralih ke IP tertentu saja: buat dulu aturan IP khusus, uji login dari IP itu, baru hapus aturan umum sambil tetap membiarkan sesi SSH lama dan konsol recovery siap sedia. Untuk akses lewat IPv6, kamu juga perlu aturan sumber IPv6 tersendiri.

Sekarang pintu SSH sudah diberi izin. Dengan **sesi SSH yang sekarang tetap terbuka**, nyalakan UFW:

```bash
# di server
sudo ufw enable
```

UFW akan memunculkan peringatan bahwa menyalakan firewall dapat memutus koneksi SSH yang sedang berjalan. Karena kamu sudah mengizinkan port `22/tcp` di langkah sebelumnya, ketik `y` lalu tekan Enter.

Periksa daftar aturan yang aktif:

```bash
# di server
sudo ufw status numbered
```

Pastikan muncul baris untuk `22/tcp` dan `22/tcp (v6)` dengan status `ALLOW IN`.

## 4. Buka port 80/443 hanya jika melayani web

Kalau servermu belum menjalankan web server, kamu **tidak perlu** membuka port lain selain SSH. Biarkan pintunya tertutup rapat.

Jika kamu sudah memasang web server seperti Nginx atau Caddy agar website bisa dibuka dari browser (`http` di port 80 dan `https` di port 443), barulah izinkan kedua port tersebut:

```bash
# di server
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Buka pintu satu per satu sesuai kebutuhan. Jangan pernah memakai prinsip "buka semua dulu, tutup nanti". Layanan internal seperti database (MySQL `3306`, PostgreSQL `5432`), Redis (`6379`), atau server pengembangan (`3000`, `5173`) **tidak boleh** dibuka ke internet bebas.

## 5. Uji dari terminal kedua

Jangan hanya percaya tulisan status di layar. Buktikan bahwa kamu benar-benar masih bisa login dari luar! Biarkan sesi SSH pertamamu tetap terbuka, lalu buka **terminal kedua** di laptop dan coba login lagi:

```bash
# di laptop, terminal kedua
ssh admin@203.0.113.10
```

- Jika sesi kedua **berhasil masuk**, selamat—aturan firewallmu bekerja dengan benar dan sesi pertama boleh ditutup.
- Jika sesi kedua **gagal masuk**, jangan panik dan **jangan tutup sesi pertama**. Perbaiki aturannya langsung dari sesi pertama yang masih hidup lewat `sudo ufw status numbered`.

Jangan lupa juga soal **firewall provider** (*cloud firewall* / *security group*) di dasbor web penyedia VPS. Itu adalah satpam terpisah di luar server. Jika UFW di server sudah mengizinkan port 22 tetapi panel provider memblokirnya, koneksi SSH tetap gagal—dan begitu pula sebaliknya. Cek keduanya kalau ada koneksi yang tidak mau tembus.

## 6. Mengubah atau menghapus aturan UFW

Untuk menghapus aturan, lihat nomor urutnya lewat `status numbered`, lalu hapus berdasarkan nomor tersebut:

```bash
# di server
sudo ufw status numbered
sudo ufw delete 3
```

**Perhatian:** Setiap kali satu aturan dihapus, **nomor urut aturan di bawahnya akan bergeser**. Jadi selalu jalankan `sudo ufw status numbered` lagi sebelum menghapus aturan berikutnya!

Supaya lebih aman dan tidak salah nomor, kamu juga bisa menghapus dengan mengetik ulang persis aturan yang dulu dibuat:

```bash
# di server
sudo ufw delete allow 443/tcp
```

**Jangan pernah menghapus aturan SSH** (`22/tcp` dan versi `(v6)`-nya) selama kamu masih login ke server lewat jalur SSH publik.

## Kalau sampai terkunci

Jika kesalahan konfigurasi membuatmu terkunci dan semua sesi SSH tertutup:

1. Masuk ke dasbor penyedia VPS di browser, lalu buka **konsol recovery / VNC / serial console**.
2. Login sebagai `root` atau `admin`.
3. Matikan UFW sementara:

```bash
# di server (lewat konsol)
sudo ufw disable
```

Perintah itu langsung mematikan UFW sehingga jalur SSH terbuka kembali. Setelah itu, perbaiki aturannya (`sudo ufw allow 22/tcp`), lalu aktifkan kembali dengan `sudo ufw enable`. Jika ternyata penyebabnya bukan UFW melainkan firewall di panel provider, ubah pengaturannya dari dasbor provider.

## Peringatan penting: Docker bisa melewati UFW!

Jika di server ini kamu menjalankan aplikasi dengan **Docker**, ada satu jebakan besar yang wajib diketahui pemula: **jangan mengira UFW otomatis melindungi kontainer Docker.**

Saat kamu menjalankan kontainer dengan opsi seperti `-p 8080:80`, Docker memasang aturan firewallnya sendiri di sistem Linux. Akibatnya, lalu lintas dari internet menuju kontainer **langsung masuk tanpa melewati aturan `INPUT` milik UFW**. Jadi, di `ufw status` port `8080` mungkin terlihat tertutup rapat, padahal sebenarnya terbuka bebas ke seluruh dunia!

Cara amannya:
- Jika kontainer diakses lewat *reverse proxy* di server yang sama (seperti Nginx atau Caddy), ikat port kontainer hanya ke alamat lokal server (`-p 127.0.0.1:8080:80`) agar tidak bisa diakses langsung dari internet.
- Untuk penyaringan Docker yang lebih lanjut, ikuti dokumentasi resmi Docker sesuai *backend* firewall yang dipakai (rantai `DOCKER-USER` berlaku pada backend `iptables`, bukan pada backend `nftables` Docker).
- Selalu cek apakah port benar-benar tertutup dari luar menggunakan langkah di [artikel cek port](/posts/debian-cek-port/).

## Referensi

- [ufw(8), Debian trixie](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)
- [Debian Wiki: Uncomplicated Firewall (ufw)](https://wiki.debian.org/Uncomplicated%20Firewall%20%28ufw%29)
- [Docker: packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. **Firewall UFW tanpa terkunci (artikel ini)**
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
