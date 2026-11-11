---
title: "Firewall UFW di Debian 13: aktifkan tanpa mengunci diri sendiri"
date: 2026-11-11T21:02:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ufw", "firewall"]
description: "Pasang UFW di Debian 13: cek port SSH asli, izinkan sebelum enable, uji sesi baru, dan tahu batas firewall saat memakai Docker."
---

Firewall menentukan koneksi masuk mana yang boleh sampai ke layanan di servermu. UFW (*Uncomplicated Firewall*) adalah antarmuka sederhana untuk aturan firewall Linux. Kesalahan paling klasik pemula: mengaktifkan UFW sebelum mengizinkan SSH, lalu sesi putus dan server tidak bisa dimasuki. Artikel ini menghindari itu dengan urutan yang benar.

Prasyarat: login `admin` + `sudo` sudah jalan ([artikel pembuka](/posts/debian-server-keamanan-awal/)) dan kamu tahu cara membuka konsol recovery provider. IP `203.0.113.10` adalah contoh; **ganti dengan IP servermu**.

## 1. Pasang dan lihat kondisi awal

```bash
# di server
sudo apt update
sudo apt install ufw
sudo ufw status verbose
```

Pada pemasangan baru yang belum diaktifkan, statusnya `Status: inactive`. Kalau sudah aktif, berhenti sebelum mengubah kebijakan: inventarisasi aturan dan kebutuhan layanan yang ada dulu. Status `inactive` hanya menyatakan UFW tidak aktif, bukan berarti tidak ada firewall lain.

```bash
# di server
sudo ufw show added
sudo iptables -S
sudo nft list ruleset
```

Kalau provider atau layanan lain sudah menambah aturan, periksa seluruh keluaran tersebut. Pada Debian, `iptables` dapat memakai backend `nftables`. Jika alatnya tidak tersedia, periksa dengan alat firewall yang terpasang; jangan menganggap aturan kosong. Jangan mencampur UFW dengan pengelola firewall lain tanpa memahami aturan yang masing-masing kelola.

## 2. Pastikan port SSH yang sebenarnya

Jangan menebak 22. Lihat port yang dipakai `sshd`:

```bash
# di server
sudo ss -ltnp | grep sshd
sudo sshd -T | grep -i '^port'
```

Pada instalasi bawaan hasilnya `0.0.0.0:22` dan `[::]:22`, serta `port 22`. Kalau berbeda, pakai angka itu di semua perintah di bawah. Cara membaca `ss` dijelaskan di [artikel cek port](/posts/debian-cek-port/).

## 3. Izinkan SSH dulu, baru aktifkan

Atur kebijakan bawaan: tolak masuk, izinkan keluar.

```bash
# di server
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
```

`allow 22/tcp` dengan UFW membuat aturan IPv4 dan IPv6 sekaligus selama IPv6 aktif di `/etc/default/ufw` (`IPV6=yes`, nilai bawaan Debian). Cek:

```bash
# di server
grep ^IPV6 /etc/default/ufw
sudo ufw show added
```

Kalau kamu punya IP tetap dan ingin lebih ketat, batasi sumbernya, misalnya `sudo ufw allow from 198.51.100.7 to any port 22 proto tcp`. Hati-hati: IP rumah yang berubah bisa menguncimu. Kalau tidak yakin, jangan batasi.

Aturan sumber terbatas itu tidak mempersempit `allow 22/tcp` yang sudah ada; keduanya bersifat menambah izin. Untuk beralih, buat izin sumber terbatas, uji dari alamat tersebut, baru hapus izin umum sambil tetap menyimpan sesi dan konsol pemulihan. Contoh `198.51.100.7` harus diganti IP publik laptopmu; akses IPv6 memerlukan aturan sumber IPv6 tersendiri.

Baru aktifkan, dengan sesi SSH lama **tetap terbuka**:

```bash
# di server
sudo ufw enable
```

UFW memperingatkan bahwa ini bisa memutus koneksi SSH. Karena SSH sudah diizinkan, jawab `y`. Lihat hasilnya:

```bash
# di server
sudo ufw status numbered
```

Harus ada baris untuk `22/tcp` dan `22/tcp (v6)` berstatus `ALLOW IN`.

## 4. Buka 80/443 hanya kalau memang melayani web

Server yang belum menjalankan web tidak perlu membuka apa pun selain SSH. Kalau kamu memasang Nginx, Caddy, atau sejenisnya:

```bash
# di server
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Satu-satu per kebutuhan; jangan "buka semua dulu, tutup nanti". Database (3306, 5432), Redis (6379), dan server pengembangan (3000, 5173) tidak seharusnya dibuka ke internet.

## 5. Uji dari sesi baru

Jangan percaya status UFW saja. Dari terminal **kedua** di laptop, buka sesi SSH baru:

```bash
# di laptop, terminal kedua
ssh admin@203.0.113.10
```

Kalau sesi baru masuk, aturanmu bekerja dan sesi lama boleh ditutup. Kalau tidak masuk, jangan tutup sesi lama; perbaiki dari sana (`sudo ufw status numbered`).

Ingat juga ada **firewall provider** (cloud firewall/security group). Itu lapisan terpisah di luar server. Kalau UFW mengizinkan 22 tapi panel provider memblokirnya, SSH tetap gagal, dan sebaliknya. Periksa keduanya kalau ada yang tidak tembus.

## 6. Mengubah atau menghapus aturan

Hapus aturan dengan nomor dari `status numbered`:

```bash
# di server
sudo ufw status numbered
sudo ufw delete 3
```

Nomor bergeser setiap ada penghapusan, jadi lihat daftar lagi sebelum menghapus berikutnya. Untuk menghindari salah nomor, hapus dengan aturan yang sama persis seperti saat membuatnya:

```bash
# di server
sudo ufw delete allow 443/tcp
```

**Jangan menghapus aturan SSH** (`22/tcp` dan versi v6-nya) selama kamu masih bergantung pada SSH.

## Kalau terkunci

Masuk lewat konsol provider sebagai `root` atau `admin`, lalu:

```bash
# di server (lewat konsol)
sudo ufw disable
```

Itu mematikan UFW sehingga SSH terbuka kembali. Perbaiki aturan (`ufw allow 22/tcp`), lalu `sudo ufw enable` lagi. Kalau ternyata penyebabnya firewall provider, ubah di panel provider, bukan di server.

## Peringatan: Docker dan port yang dipublikasikan

Kalau kamu memakai Docker, jangan menganggap UFW otomatis melindungi kontainer. Port yang dipublikasikan dengan `-p 8080:80` dipasang Docker lewat aturan firewall-nya sendiri, dan lalu lintas ke kontainer **tidak melewati aturan INPUT UFW**. Dokumentasi Docker menjelaskan bahwa aturan UFW tidak membatasi port yang dipublikasikan itu. Akibatnya `ufw status` bisa tampak aman padahal port kontainer terbuka ke dunia.

Publikasikan port aplikasi hanya ke loopback (`-p 127.0.0.1:8080:80`) jika diakses lewat reverse proxy pada host. Untuk penyaringan Docker yang lebih lanjut, ikuti dokumentasi sesuai backend: rantai `DOCKER-USER` berlaku pada backend iptables, bukan backend nftables Docker. Periksa juga dari luar, seperti di [artikel cek port](/posts/debian-cek-port/).

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
