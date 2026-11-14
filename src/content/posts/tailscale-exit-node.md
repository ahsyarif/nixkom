---
title: "Exit node Tailscale: koneksi internet lewat Debian"
date: 2026-11-11T22:07:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","exit-node","vpn","routing"]
description: "Atur Debian sebagai exit node Tailscale, pilih dari laptop atau HP, periksa IP keluar, lalu kembalikan koneksi tanpa mengubah rute lain."
---

Secara bawaan, Tailscale hanya membawa lalu lintas yang tujuannya memang perangkat lain di dalam *tailnet*-mu—sementara saat kamu membuka situs web biasa di internet (seperti YouTube atau Google), koneksimu tetap langsung lewat Wi-Fi atau operator seluler lokalmu.

Dengan menyalakan **Exit Node**, seluruh lalu lintas internet dari laptop atau HP milikmu akan dibelokkan masuk ke terowongan terenkripsi menuju server Debian pilihanmu terlebih dahulu, baru keluar ke internet dari sana. Hasilnya:
- Sangat berguna untuk mengamankan koneksi saat memakai Wi-Fi publik di kafe atau bandara.
- Situs web yang kamu buka akan melihat **alamat IP publik milik server Debian**, bukan IP jaringan Wi-Fi tempatmu duduk sekarang.

**Apa bedanya dengan Subnet Router?** [Subnet router](/posts/tailscale-subnet-router/) membuka jalan khusus untuk menjangkau perangkat tertentu di jaringan lokal rumah (seperti NAS/printer), sedangkan **Exit Node** menyalurkan **seluruh koneksi internet umum** melewati server Debian.

> **Catatan privasi yang jujur:** Exit node melindungi koneksimu di jaringan Wi-Fi lokal dan mengubah alamat IP yang terlihat oleh situs web, tetapi **tidak membuatmu anonim sepenuhnya**. Situs tetap bisa mengenalimu lewat akun yang login, *cookie*, dan sidik jari browser. Selain itu, pengelola server Debian dan penyedia internet/VPS server tersebut menjadi pihak yang melihat titik keluar koneksimu.

## 1. Siapkan server Debian yang stabil

Pastikan server Debian sudah [terpasang Tailscale](/posts/tailscale-debian-pemula/) dan punya akses internet sendiri. Pilih server dengan kecepatan dan kuota internet yang memadai serta sesuai dengan aturan penyedia VPS, karena semua unduhan dan tontonan dari laptop/HP milikmu nantinya akan memakai kuota bandwidth server tersebut.

Siapkan juga akses konsol darurat (recovery) dari penyedia server, dan periksa status masa berlaku kunci (*key expiry*) di dasbor Tailscale. Jangan sampai ketika satu-satunya jalur admin terputus, kamu baru bingung mencari akses alternatif.

## 2. Nyalakan IP forwarding dan tawarkan sebagai Exit Node

Supaya server Debian mau meneruskan paket internet dari laptop/HP ke luar internet, nyalakan *IP forwarding* di sistem Debian.

Pertama, catat dulu nilai awalnya:

```bash
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
```

Jika kamu sebelumnya sudah mengikuti panduan subnet router dan sudah membuat konfigurasi forwarding, gunakan saja konfigurasi yang sama. Jika belum ada, buat `/etc/sysctl.d/99-tailscale-routing.conf` memakai `sudoedit` (pastikan tidak menimpa file yang sudah ada):

```ini
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
```

Terapkan pengaturannya, cek hasilnya, lalu beritahukan ke Tailscale bahwa server Debian ini siap menjadi **Exit Node**:

```bash
sudo sysctl -p /etc/sysctl.d/99-tailscale-routing.conf
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
sudo tailscale set --advertise-exit-node
```

Pastikan kedua nilai forwarding menunjukkan angka `1`.

**Catatan penting soal jaringan dan firewall:**
- Jika server menggunakan IPv6 berbasis *Router Advertisement* (RA), perhatikan penerimaan RA setelah menyalakan forwarding IPv6—siapkan konsol darurat bila ada rute server yang berubah.
- Pertahankan firewall server tetap menolak forwarding yang tidak dimaksudkan. Jangan mematikan firewall atau menambah aturan *masquerade* sembarangan; panduan ini mengandalkan pengaturan `netfilter` bawaan Tailscale.
- Debian diasumsikan sudah login lewat `tailscale up` sebelumnya (kalau belum, selesaikan login dulu). Server Debian juga **tidak perlu** menyalakan `--accept-routes` hanya untuk menjadi Exit Node.

## 3. Setujui di dasbor dan atur izin (*grants*)

Menjalankan perintah `--advertise-exit-node` baru sekadar "mengajukan diri"—administrator tetap harus menyetujuinya di dasbor agar aman:

1. Buka [Machines](https://console.tailscale.com/admin/machines), klik server Debian-mu, lalu pilih **Edit route settings** dan aktifkan **Use as exit node** (kamu butuh peran admin untuk menyetujuinya).
2. Soal izin di kebijakan (*grants*): kalau *tailnet*-mu masih memakai kebijakan bawaan (*allow-all*), semua perangkat biasanya otomatis boleh memakai Exit Node. Namun jika kebijakan *tailnet*-mu sudah diperketat, tambahkan izin menuju **`autogroup:internet`** di dalam array `grants`:

```json
{
  "src": ["100.101.102.10"],
  "dst": ["autogroup:internet"],
  "ip": ["*"]
}
```

Ganti `100.101.102.10` dengan IP Tailscale laptop/perangkat yang boleh memakainya. (Memberi akses ke IP server Debian saja hanya mengizinkan koneksi ke server itu, bukan memakainya sebagai pintu keluar ke seluruh internet!). Izin `autogroup:internet` hanya memberi *hak* keluar ke internet; menentukan Exit Node mana yang dipakai tetap dipilih dari sisi laptop/HP. Periksa [panduan grants](/posts/tailscale-grants-pemula/) dan aturan lain di kebijakanmu sebelum menyimpan.

## 4. Pilih Exit Node dari laptop atau HP

Menyalakan Exit Node di server **tidak otomatis** memindahkan lalu lintas internet siapa pun—setiap laptop atau HP harus memilihnya sendiri.

Catat dulu IPv4 Tailscale milik server Debian (lewat `tailscale ip -4` di server).

- **Di aplikasi HP (Android/iOS) atau desktop (Windows/macOS):** buka aplikasi Tailscale, ketuk menu **Exit Node**, lalu pilih nama server Debian-mu.
- **Di laptop Linux:** jalankan perintah berikut (ganti IP dengan IP Tailscale server Debian-mu):

```bash
# di laptop; ganti dengan IP Tailscale Debian
sudo tailscale set --exit-node=100.101.102.103
tailscale status
```

### Bagaimana kalau butuh printer atau perangkat di Wi-Fi lokal?
Saat Exit Node aktif, secara bawaan Tailscale **memblokir akses ke perangkat LAN lokal** (seperti printer atau router) di jaringan tempat laptopmu sedang berada demi keamanan di Wi-Fi publik. Jika kamu sedang di jaringan tepercaya dan memang butuh mengakses printer lokal saat Exit Node menyala, aktifkan **Allow LAN access** di menu aplikasi, atau di laptop Linux jalankan:

```bash
sudo tailscale set --exit-node-allow-lan-access=true
```

Pahami perbedaannya: opsi ini membuka akses ke LAN **tempat laptop berada** (misalnya printer kantormu), **bukan** membuka akses ke LAN rumah tempat Exit Node berada (untuk itu kamu butuh Subnet Router). Saat memakai Wi-Fi publik di kafe, biarkan opsi ini **mati**.

## 5. Cek apakah IP keluar benar-benar berubah (dan pahami kalau server mati)

Untuk membuktikan lalu lintas internetmu sudah lewat server Debian:
1. Sebelum dan sesudah menyalakan Exit Node, buka layanan pengecek IP yang kamu percaya, misalnya [Cloudflare trace](https://www.cloudflare.com/cdn-cgi/trace), lalu perhatikan baris `ip=`. (Catatan: membuka halaman itu membagikan IP dan metadata koneksimu kepada Cloudflare; alternatifnya, cek ke server/endpoint milikmu sendiri).
2. Bandingkan dengan hasil saat kamu mengakses endpoint yang sama langsung dari terminal server Debian. Saat Exit Node aktif, IP klien yang tercatat harusnya sama dengan IP publik server Debian (cek baik IPv4 maupun IPv6 jika kamu memakai keduanya—satu hasil IPv4 belum tentu membuktikan IPv6 ikut lewat jalur yang sama). Pastikan juga website HTTPS dan pencarian nama domain (DNS) tetap berjalan lancar.

**Apa yang terjadi kalau server Debian mendadak mati atau kuncinya kedaluwarsa?**
Laptop/HP-mu bisa **kehilangan akses internet sama sekali**, alih-alih diam-diam pindah kembali ke Wi-Fi lokal. Tailscale sengaja melakukan ini untuk mencegah datamu "bocor" keluar lewat jalur publik tanpa sepengetahuanmu. Jika itu terjadi, cukup matikan pilihan Exit Node di laptop/HP untuk kembali ke koneksi biasa. Jangan juga menganggap fitur ini sebagai pengganti sistem kebijakan VPN wajib pada perangkat kantor yang dikelola organisasi.

## 6. Kembali ke koneksi internet biasa

Jika sudah selesai memakai Exit Node:
- **Di aplikasi HP atau desktop:** pilih **None** pada menu Exit Node.
- **Di laptop Linux:** jalankan:

```bash
sudo tailscale set --exit-node= --exit-node-allow-lan-access=false
```

Tailscale akan tetap menyala untuk koneksi antarperangkat privat seperti biasa, sementara browsing internetmu kembali memakai Wi-Fi/seluler lokal. Periksa kembali IP publikmu untuk memastikannya.

Jika server Debian itu sendiri tidak mau dijadikan Exit Node lagi ke depannya:
1. Cabut centang persetujuannya di dasbor **Machines**.
2. Jalankan di server Debian:

```bash
sudo tailscale set --advertise-exit-node=false
```

3. Hapus aturan `grants` khusus `autogroup:internet` bila tidak dipakai lagi.
4. Jangan asal mematikan `ip_forward` jika masih dipakai oleh Subnet Router, Docker, atau layanan lain. Hanya hapus file konfigurasi forwarding percobaan dan kembalikan nilai `sysctl` awal jika kamu yakin tidak ada layanan lain yang memakainya.

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
