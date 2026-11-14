---
title: "Tailscale di Debian 13: hubungkan laptop dan server"
date: 2026-11-11T22:00:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","vpn","linux"]
description: "Pasang Tailscale di Debian 13, hubungkan laptop ke tailnet yang sama, lalu periksa alamat privat dan koneksinya sebelum mengakses layanan."
---

Bayangkan kamu punya server Debian di rumah atau di penyedia cloud, dan kamu ingin menghubungkannya dengan laptop atau HP milikmu dari mana saja—tanpa harus pusing mengatur router atau membuka port ke seluruh internet. Di sinilah **Tailscale** membantu.

Tailscale menghubungkan perangkat-perangkatmu lewat jaringan pribadi virtual bernama **tailnet**. Anggap saja *tailnet* itu seperti "grup privat" khusus perangkat milikmu sendiri: laptop dan server bisa saling berkomunikasi memakai alamat Tailscale meski sedang berada di jaringan Wi-Fi atau operator seluler yang berbeda.

> **Penting untuk diingat:** Alamat Tailscale ini **tidak menggantikan** IP publik server, dan memasang Tailscale **tidak otomatis menutup** port atau layanan yang sebelumnya sudah terlanjur terbuka ke internet. Urusan menutup akses publik tetap harus kamu atur lewat firewall.

Contoh di panduan ini memakai **Debian 13 (*trixie*)** dengan akun yang memiliki akses `sudo`. Semua perintah dijalankan di server kecuali diberi keterangan lain. Panduan mengacu pada dokumentasi resmi Tailscale yang diperiksa November 2026; perintahnya belum diuji langsung pada server Debian nyata.

## Pasang dari repositori resmi

Pertama, siapkan `curl` (alat untuk mengunduh file dari terminal) dan `ca-certificates` (daftar sertifikat agar sistem bisa memverifikasi keamanan HTTPS saat mengunduh paket):

```bash
sudo apt update
sudo apt install curl ca-certificates
```

Selanjutnya, tambahkan kunci keamanan (GPG) dan daftar repositori resmi Tailscale khusus untuk Debian 13 (*trixie*). **Jangan** memakai nama rilis `trixie` ini untuk Debian versi lain:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install tailscale
sudo systemctl enable --now tailscaled
sudo tailscale up
```

Pastikan setiap unduhan dan proses `apt` selesai tanpa galat sebelum lanjut ke langkah berikutnya.

Perintah terakhir (`sudo tailscale up`) akan mencetak sebuah **URL autentikasi** di terminal. Buka tautan tersebut di peramban (browser) kamu, lalu masuk ke akun Tailscale.
- **Jangan pernah membagikan URL login tersebut** kepada orang lain, karena siapa pun yang membukanya bisa menyambungkan server ini ke akun mereka.
- Jika *tailnet* kamu mengaktifkan fitur persetujuan perangkat (*device approval*), admin harus menyetujui server baru ini di konsol sebelum bisa dipakai.

## Hubungkan laptop ke tailnet yang sama

Sekarang kita masukkan perangkat kedua—laptop (atau HP)—ke dalam "grup privat" yang sama:

1. Pasang aplikasi Tailscale dari [halaman unduhan resmi](https://tailscale.com/download) sesuai sistem operasi laptopmu.
2. Login ke akun dan *tailnet* yang **sama** dengan server tadi, lalu aktifkan koneksinya. HP Android atau iOS juga bisa bergabung melalui aplikasi resmi; cukup izinkan konfigurasi VPN yang diminta oleh sistem HP.
3. Buka [daftar perangkat](https://console.tailscale.com/admin/machines) di dasbor web Tailscale. Pastikan laptop dan server sudah tercatat serta berstatus terhubung.

> **Peringatan:** Pada komputer bersama atau komputer pinjaman, jangan masuk memakai akun orang lain hanya agar kedua perangkat muncul di daftar yang sama.

## Periksa IP dan jalur koneksi

Setelah keduanya terhubung, cek versi, alamat IP privat Tailscale, dan status jaringan dari terminal server:

```bash
tailscale version
tailscale ip -4
tailscale status
```

Salin alamat IPv4 yang muncul dari keluaran `tailscale ip -4`. Contoh di bawah ini memakai `100.101.102.103` hanya sebagai ilustrasi—jangan menyalin angka contoh ini, pakai milik servermu sendiri.

Sekarang pindah ke terminal laptop (yang sudah terpasang CLI Tailscale), lalu uji koneksinya:

```bash
# di laptop; ganti alamat dengan IP Tailscale server
tailscale ping 100.101.102.103
```

Saat melakukan `tailscale ping`, kamu mungkin melihat jalur koneksi bertuliskan **direct** atau **DERP**:
- **Direct (langsung):** Laptop dan server berhasil terhubung langsung satu sama lain, seperti dua orang yang mengobrol tatap muka.
- **Relai DERP:** Jalur perantara terenkripsi yang dipakai otomatis ketika dua perangkat belum bisa terhubung langsung (biasanya karena terhalang router/NAT atau firewall yang ketat). Tenang saja, melewati relai **tidak menghilangkan enkripsi** antarperangkat—server relai tidak bisa mengintip isi datamu.

Perlu dicatat, keberhasilan `tailscale ping` baru membuktikan bahwa **jalur antarperangkatnya sudah tersambung**. Itu **belum** membuktikan bahwa layanan seperti SSH atau aplikasi web di port tertentu sudah boleh diakses.

Kenapa alamat IP Tailscale terlihat unik (biasanya berawalan `100.x.y.z`)? Karena IPv4 Tailscale berasal dari rentang khusus `100.64.0.0/10`—bukan IP publik yang bisa diakses sembarang orang di internet. Hati-hati jika komputermu juga memakai VPN lain yang kebetulan menggunakan rentang IP yang sama, karena keduanya bisa mengalami benturan rute. Tailscale juga menyediakan alamat IPv6 yang bisa kamu lihat dengan `tailscale ip -6`.

## Kalau perangkat belum bisa terhubung

Jika laptop dan server belum mau saling terhubung, cek dulu tiga hal di konsol admin: apakah akun/*tailnet*-nya sudah sama, apakah perangkat sudah disetujui (*device approval*), dan apakah kunci perangkat belum kedaluwarsa (*key expiry*).

Di sisi server Debian, kamu bisa memeriksa kondisi layanan Tailscale dengan perintah berikut:

```bash
systemctl status tailscaled
sudo journalctl -u tailscaled -n 50 --no-pager
tailscale netcheck
```

Jika ingin bertanya di forum atau komunitas, **jangan mengunggah log mentah** yang memuat identitas akun atau alamat internalmu. Ingat juga bahwa Tailscale tetap membutuhkan akses internet/jaringan untuk autentikasi, koordinasi, dan koneksi antarperangkat; ia tidak menembus semua pembatasan firewall secara otomatis.

Kalau suatu saat kamu ingin memutuskan koneksi Tailscale sementara, jalankan `sudo tailscale down`, dan sambungkan lagi dengan `sudo tailscale up`. **Jangan menjalankan `tailscale down` jika kamu sedang mengendalikan server melalui satu-satunya sesi SSH yang melewati Tailscale**, karena koneksimu akan langsung terputus!

Setelah jalur antarperangkat dipastikan bekerja dengan baik, lanjutkan ke langkah berikutnya: [SSH melalui IP privat](/posts/tailscale-ssh-debian/).

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
