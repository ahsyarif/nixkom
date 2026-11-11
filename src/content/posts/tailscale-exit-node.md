---
title: "Exit node Tailscale: koneksi internet lewat Debian"
date: 2026-11-11T22:07:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","exit-node","vpn","routing"]
description: "Atur Debian sebagai exit node Tailscale, pilih dari laptop atau HP, periksa IP keluar, lalu kembalikan koneksi tanpa mengubah rute lain."
---

Exit node Tailscale meneruskan koneksi internet klien melalui perangkat yang kamu pilih. Situs tujuan akan melihat IP publik jalur keluar Debian, bukan IP publik jaringan laptopmu. Tanpa exit node, Tailscale biasanya hanya membawa lalu lintas ke tujuan tailnet dan rute khusus yang kamu aktifkan.

Ini berbeda dari [subnet router](/posts/tailscale-subnet-router/), yang membuka jalur ke jaringan tertentu. Exit node tidak membuatmu anonim: situs masih bisa mengenali akun, kuki, dan identitas peramban. Pengelola Debian serta penyedia jaringan keluarnya juga menjadi pihak yang kamu percaya.

## Siapkan Debian yang bisa terus menyala

Pasang [Tailscale di Debian dan klien](/posts/tailscale-debian-pemula/). Pilih server dengan koneksi internet memadai dan izin provider untuk lalu lintas yang akan diteruskan. Seluruh penggunaan klien dapat memakan kuota atau bandwidth server.

Pastikan Debian sendiri bisa membuka internet. Siapkan konsol pemulihan dan periksa kedaluwarsa kunci perangkat di konsol Tailscale. Jangan baru mencari akses alternatif ketika satu-satunya jalur administrasi terputus.

## Aktifkan forwarding lalu iklankan exit node

Di Debian, catat nilai awal:

```bash
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
```

Jika sudah mengikuti panduan subnet router, gunakan konfigurasi forwarding yang sama. Jika belum, buat `/etc/sysctl.d/99-tailscale-routing.conf` dengan `sudoedit`, setelah memastikan tidak menimpa berkas yang sudah ada:

```ini
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
```

Aktifkan dan periksa hasilnya:

```bash
sudo sysctl -p /etc/sysctl.d/99-tailscale-routing.conf
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
sudo tailscale set --advertise-exit-node
```

Kedua nilai forwarding harus 1. Jika jaringan IPv6 server bergantung pada Router Advertisement, periksa penerimaan RA ketika mengaktifkan forwarding; gunakan konsol bila perubahan mengganggu rute server. Pertahankan firewall dengan forwarding yang tidak dimaksudkan tetap ditolak. Jangan mematikan firewall atau menambah masquerade serampangan; contoh ini memakai pengelolaan netfilter bawaan Tailscale.

Debian sudah terhubung melalui `tailscale up` pada tahap pemasangan. Jika belum terhubung, selesaikan login terlebih dahulu. Tidak perlu mengaktifkan `--accept-routes` pada server hanya untuk menjadi exit node.

## Setujui perangkat dan izin pengguna

Buka [Machines](https://console.tailscale.com/admin/machines), pilih Debian, lalu **Edit route settings** dan aktifkan **Use as exit node**. Kamu memerlukan peran yang boleh menyetujui perubahan tersebut.

Jika tailnet masih memakai kebijakan bawaan, pengguna biasanya sudah mendapat izin memakai exit node. Pada kebijakan yang diperketat, tambahkan izin menuju `autogroup:internet`, misalnya objek berikut dalam array `grants`:

```json
{
  "src": ["100.101.102.10"],
  "dst": ["autogroup:internet"],
  "ip": ["*"]
}
```

Ganti IP ilustrasi dengan laptop yang berhak. Memberi akses ke IP Debian saja hanya membolehkan koneksi ke Debian, bukan pemakaiannya sebagai gerbang internet. Izin `autogroup:internet` ini tidak memilih satu exit node tertentu; pemilihan dilakukan pada klien. Periksa [grants](/posts/tailscale-grants-pemula/) dan aturan luas yang masih ada sebelum menyimpan kebijakan.

## Pilih dari laptop atau HP

Catat IP Tailscale Debian dari `tailscale ip -4` di server. Pada **laptop Linux**, gunakan alamatnya:

```bash
# di laptop; ganti dengan IP Tailscale Debian
sudo tailscale set --exit-node=100.101.102.103
tailscale status
```

Di aplikasi HP atau desktop, buka pilihan **Exit Node**, lalu pilih Debian. Setiap klien memilih sendiri; mengiklankan server tidak otomatis memindahkan seluruh pengguna ke sana.

Akses ke LAN lokal klien secara bawaan dibatasi saat memakai exit node. Jika benar-benar memerlukan printer atau perangkat LAN yang kamu percaya, aktifkan **Allow LAN access**, atau di laptop Linux:

```bash
sudo tailscale set --exit-node-allow-lan-access=true
```

Opsi itu membolehkan akses langsung ke LAN tempat laptop berada. Ia tidak membuka akses ke LAN rumah tempat exit node berada; kebutuhan itu memerlukan subnet router. Pada Wi-Fi publik, biarkan pengecualian LAN mati kecuali memang diperlukan.

## Periksa IP keluar dan kegagalan koneksi

Sebelum dan sesudah memilih exit node, buka layanan pemeriksa IP publik yang kamu percaya, misalnya [Cloudflare trace](https://www.cloudflare.com/cdn-cgi/trace), lalu lihat baris `ip=`. Permintaan itu membagikan IP dan metadata koneksi kepada Cloudflare. Alternatifnya, gunakan endpoint milikmu sendiri yang mencatat IP sumber.

Bandingkan dengan permintaan dari Debian ke endpoint yang sama. Saat exit node aktif, IP klien semestinya sesuai jalur keluar Debian untuk keluarga IP yang diuji. Jika membutuhkan IPv4 dan IPv6, periksa keduanya secara terpisah; satu hasil tidak membuktikan seluruh aplikasi memakai jalur yang sama. Pastikan juga situs HTTPS dan resolusi DNS tetap bekerja.

Jika server mati atau kuncinya kedaluwarsa, klien dapat kehilangan akses internet alih-alih otomatis kembali ke jalur biasa. Tailscale mempertahankan pemilihan exit node untuk mencegah kebocoran lewat jalur lain. Matikan pilihan exit node secara eksplisit bila ingin kembali ke jaringan lokal. Jangan menganggapnya pengganti kebijakan VPN wajib pada perangkat yang dikelola organisasi.

## Kembali ke koneksi biasa

Di laptop Linux:

```bash
sudo tailscale set --exit-node= --exit-node-allow-lan-access=false
```

Di aplikasi HP/desktop, pilih **None** pada Exit Node. Tailscale tetap terhubung untuk akses privat. Periksa IP publik lagi untuk memastikan lalu lintas kembali ke koneksi biasa.

Jika server tidak akan dipakai sebagai exit node lagi, cabut persetujuannya di konsol dan jalankan di Debian:

```bash
sudo tailscale set --advertise-exit-node=false
```

Hapus grants khusus internet bila tidak lagi dibutuhkan. Jangan mematikan forwarding yang masih dipakai subnet router, Docker, atau fungsi lain. Jika konfigurasi forwarding tadi hanya untuk percobaan ini, kembalikan berkas dan nilai sysctl ke kondisi awal yang dicatat.

## Referensi

- [Exit nodes: konfigurasi dan pemilihan klien](https://tailscale.com/docs/features/exit-nodes)
- [Referensi tailscale set](https://tailscale.com/docs/reference/tailscale-cli#set)
- [Kedaluwarsa kunci perangkat](https://tailscale.com/docs/features/access-control/key-expiry)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. **Exit node Tailscale: koneksi internet lewat Debian (artikel ini)**
