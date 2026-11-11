---
title: "Tailscale di Debian 13: hubungkan laptop dan server"
date: 2026-11-11T22:00:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","vpn","linux"]
description: "Pasang Tailscale di Debian 13, hubungkan laptop ke tailnet yang sama, lalu periksa alamat privat dan koneksinya sebelum mengakses layanan."
---

Tailscale menghubungkan laptop dan server lewat jaringan privat bernama *tailnet*. Kamu bisa mengakses server memakai alamat Tailscale meskipun kedua perangkat berada di jaringan berbeda. Alamat itu tidak menggantikan IP publik server, dan pemasangan Tailscale tidak otomatis menutup layanan yang sudah terbuka ke internet.

Contoh ini memakai Debian 13 (*trixie*) dengan akun yang punya akses sudo. Perintah dijalankan di server kecuali diberi keterangan lain. Panduan mengacu pada dokumentasi resmi Tailscale yang diperiksa November 2026; perintahnya belum diuji pada server Debian nyata.

## Pasang dari repositori resmi

Siapkan curl dan sertifikat CA:

```bash
sudo apt update
sudo apt install curl ca-certificates
```

Tambahkan kunci dan sumber paket khusus trixie. Jangan memakai nama rilis ini untuk Debian versi lain.

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install tailscale
sudo systemctl enable --now tailscaled
sudo tailscale up
```

Pastikan tiap unduhan dan apt selesai tanpa galat sebelum lanjut. Buka URL autentikasi yang dicetak oleh perintah terakhir di perambanmu, lalu masuk ke akun Tailscale. Jangan membagikan URL login tersebut. Bila tailnet mewajibkan persetujuan perangkat, admin perlu menyetujuinya sebelum dipakai.

## Hubungkan laptop ke tailnet yang sama

Pasang aplikasi dari [halaman unduhan resmi](https://tailscale.com/download) sesuai sistem operasi laptop. Login ke tailnet yang sama dengan server, lalu aktifkan koneksinya. HP Android atau iOS juga bisa bergabung melalui aplikasi resmi; izinkan konfigurasi VPN yang diminta sistem.

Buka [daftar perangkat](https://console.tailscale.com/admin/machines). Pastikan laptop dan server tercatat serta sedang terhubung. Pada komputer bersama, jangan masuk memakai akun orang lain hanya agar kedua perangkat muncul di daftar yang sama.

## Periksa IP dan jalur koneksi

Di server:

```bash
tailscale version
tailscale ip -4
tailscale status
```

Salin IP dari keluaran server. Contoh berikut memakai `100.101.102.103` sebagai ilustrasi, bukan alamat yang harus kamu salin. Di terminal laptop yang menyediakan CLI Tailscale:

```bash
# di laptop; ganti alamat dengan IP Tailscale server
tailscale ping 100.101.102.103
```

Koneksi bisa langsung (*direct*) atau melalui relai DERP ketika jalur langsung belum tersedia. Relai tidak menghilangkan enkripsi antarperangkat. Keberhasilan ping Tailscale memeriksa jalur ke perangkat; itu belum membuktikan SSH atau aplikasi web di port tertentu boleh diakses.

IP Tailscale IPv4 berasal dari rentang `100.64.0.0/10`, bukan IP publik yang bisa diakses sembarang perangkat internet. Komputer yang memakai rentang sama untuk VPN lain dapat mengalami benturan rute. Tailscale juga menyediakan IPv6; lihat dengan `tailscale ip -6`.

## Kalau perangkat belum bisa terhubung

Periksa akun/tailnet, persetujuan perangkat, dan status kedaluwarsa kunci di konsol. Di Debian, gunakan:

```bash
systemctl status tailscaled
sudo journalctl -u tailscaled -n 50 --no-pager
tailscale netcheck
```

Jangan mengunggah log mentah yang memuat identitas atau alamat internal ke forum publik. Tailscale tetap membutuhkan akses jaringan untuk autentikasi, koordinasi, dan koneksi antarperangkat; ia tidak menembus semua pembatasan firewall secara otomatis.

Untuk memutuskan Tailscale sementara, jalankan `sudo tailscale down`; sambungkan lagi dengan `sudo tailscale up`. Jangan memutuskannya dari satu-satunya sesi administrasi yang sedang melewati Tailscale. Setelah jalurnya bekerja, lanjutkan ke [SSH melalui IP privat](/posts/tailscale-ssh-debian/).

## Referensi

- [Paket resmi untuk Debian trixie](https://pkgs.tailscale.com/stable/#debian-trixie)
- [Instalasi Tailscale di Linux](https://tailscale.com/docs/install/linux)
- [Referensi CLI Tailscale](https://tailscale.com/docs/reference/tailscale-cli)

## Seri Tailscale untuk pemula

1. **Tailscale di Debian 13: hubungkan laptop dan server (artikel ini)**
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
