---
title: "Subnet router Tailscale untuk akses jaringan rumah"
date: 2026-11-11T22:06:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","subnet-router","routing"]
description: "Jadikan Debian subnet router Tailscale untuk mengakses perangkat LAN. Atur forwarding, persetujuan rute, grants, dan cara menarik rutenya."
---

Tidak semua perangkat di jaringan lokal (LAN) rumah atau kantor bisa dipasangi aplikasi Tailscale—contohnya perangkat penyimpanan **NAS**, printer jaringan, kamera CCTV, atau perangkat *smart home* tertentu.

Di sinilah **Subnet Router** membantu. Bayangkan kamu menaruh satu komputer Debian di rumah, memasang Tailscale di sana, lalu menjadikannya "resepsionis/jembatan". Saat kamu sedang di luar rumah, laptopmu menghubungi Debian lewat Tailscale, lalu Debian meneruskan pesan itu ke perangkat NAS atau printer di dalam jaringan lokal rumahmu.

**Kapan sebaiknya tidak pakai Subnet Router?** Jika perangkat tujuanmu (misalnya server lain atau komputer kantor) sebenarnya *bisa* dipasangi Tailscale langsung, lebih baik pasang Tailscale langsung di perangkat tersebut karena lebih sederhana dan koneksinya terenkripsi ujung-ke-ujung sampai ke perangkat tujuan.

Sebagai contoh di panduan ini, kita punya Debian di rumah yang berada satu jaringan dengan NAS beralamat `192.168.50.10` pada jaringan LAN `192.168.50.0/24` (semua alamat ini ilustrasi—ganti dengan milikmu). Ingat: **komputer Debian yang menjadi subnet router harus benar-benar tersambung ke jaringan lokal tersebut**; VPS di cloud/data center tidak otomatis bisa menjangkau jaringan Wi-Fi rumahmu.

## 1. Periksa jaringan lokal sebelum mulai

Di komputer Debian rumah yang sudah [terpasang Tailscale](/posts/tailscale-debian-pemula/), cek dulu alamat IP lokalnya, rute jaringannya, dan buktikan bahwa Debian sendiri bisa menghubungi perangkat tujuan (NAS):

```bash
ip -4 address
ip -4 route
curl --connect-timeout 5 --max-time 10 http://192.168.50.10/
```

Ganti tujuan `curl` dengan layanan LAN yang memang kamu kelola (jika NAS memakai HTTPS atau port lain, sesuaikan URL-nya—jangan mematikan pemeriksaan sertifikat SSL hanya untuk menutupi error). Debian wajib bisa mengakses perangkat LAN itu terlebih dulu sebelum dijadikan perantara.

**Tips aman untuk pemula:** Untuk latihan pertama, iklankan **satu perangkat spesifik saja** dengan akhiran `/32` (`192.168.50.10/32`, artinya hanya 1 alamat IP itu), bukan langsung seluruh rentang LAN rumah (`/24`).

Periksa juga apakah alamat jaringan di tempat laptopmu berada nanti **bentrok** dengan jaringan rumah. Misalnya, kalau jaringan Wi-Fi rumah memakai `192.168.1.0/24` dan Wi-Fi kafe tempat laptopmu berada juga memakai `192.168.1.0/24`, laptop akan bingung apakah `192.168.1.10` itu ada di kafe atau di rumah (mengaktifkan ulang `--accept-routes` tidak dapat mengatasi bentrokan alamat yang kembar—pilih rentang IP rumah yang agak unik seperti `192.168.50.0/24`).

## 2. Izinkan penerusan paket IP (*IP forwarding*) di Debian

Agar Debian mau berperan sebagai "jembatan" yang meneruskan lalu lintas dari antarmuka Tailscale ke antarmuka jaringan lokal, fitur *IP forwarding* di kernel Linux harus dinyalakan.

Pertama, catat dulu nilai awal di sistemmu dan pastikan file konfigurasi contoh berikut belum terpakai oleh hal lain:

```bash
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
sudo test ! -e /etc/sysctl.d/99-tailscale-routing.conf
```

Jika file `99-tailscale-routing.conf` sudah ada, jangan menimpanya—baca dan sesuaikan isinya. Jika belum ada, buat dengan `sudoedit /etc/sysctl.d/99-tailscale-routing.conf` dan isi:

```ini
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
```

Terapkan pengaturannya dan periksa bahwa nilainya sudah menjadi `1`:

```bash
sudo sysctl -p /etc/sysctl.d/99-tailscale-routing.conf
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
```

**Catatan keamanan & jaringan:**
- Contoh ini mengaktifkan *forwarding* IPv4 dan IPv6 sesuai dokumentasi Linux Tailscale meski rute contoh di bawah hanya IPv4. Jika server Debian-mu memakai IPv6 lewat *Router Advertisement* (RA), cek pengaturan jaringan agar pengaktifan *forwarding* IPv6 tidak mengganggu rute IPv6 server (siapkan akses konsol lokal/pemulihan).
- Firewall di Debian tetap harus menolak penerusan paket yang tidak diizinkan—**jangan** mengubah kebijakan *forwarding* umum menjadi bebas (`ACCEPT`) atau mematikan firewall! Tailscale memasang aturan penerusannya sendiri secara bawaan pada mode `netfilter`; jika kamu punya firewall khusus, pastikan jalur dari antarmuka Tailscale ke antarmuka LAN beserta lalu lintas balasannya diizinkan secara terarah.

## 3. Iklankan rute, setujui di dasbor, lalu beri izin akses

Di komputer Debian yang menjadi subnet router, beri tahu Tailscale alamat mana yang ingin ia bagikan:

```bash
sudo tailscale set --advertise-routes=192.168.50.10/32
```

**Perhatian:** Opsi `--advertise-routes=` ini **mengganti** seluruh daftar rute yang diiklankan perangkat tersebut. Jika sebelumnya Debian sudah mengiklankan rute lain, tuliskan semuanya sekaligus dipisahkan tanda koma (misalnya `192.168.50.10/32,192.168.60.0/24`) agar rute lama tidak hilang.

Setelah diiklankan dari terminal, ada **dua langkah persetujuan** di dasbor web Tailscale:

1. **Setujui rutenya di daftar perangkat:** Buka [Machines](https://console.tailscale.com/admin/machines), pilih komputer Debian rumahmu, klik **Edit route settings**, lalu centang untuk menyetujui rute `192.168.50.10/32`.
2. **Beri izin di kebijakan (`grants`):** Menyetujui rute baru berarti Debian *boleh menawarkan* jalan itu, tetapi perangkat klien belum tentu diizinkan melewatinya jika kebijakanmu diperketat. Tambahkan objek izin berikut ke dalam array `grants` (ganti IP laptop `100.101.102.10` dan alamat/port NAS sesuai punyamu):

```json
{
  "src": ["100.101.102.10"],
  "dst": ["192.168.50.10"],
  "ip": ["tcp:80"]
}
```

Ikuti [panduan grants](/posts/tailscale-grants-pemula/) untuk cara menggabungkan blok ini ke file kebijakan yang ada, memeriksa apakah masih ada aturan *allow-all*, dan mengujinya.

## 4. Aktifkan penerimaan rute di laptop

Agar mau menerima jalur pintas menuju `192.168.50.10` lewat Debian:
- **Pada Windows, macOS, Android, dan iOS:** Tailscale menerima rute subnet **secara otomatis** (cek pengaturan aplikasi kalau dulu pernah kamu matikan).
- **Pada laptop Linux:** Kamu harus mengaktifkannya secara eksplisit dengan perintah ini (dijalankan di **laptop Linux**, bukan di router Debian):

```bash
sudo tailscale set --accept-routes=true
curl --connect-timeout 5 --max-time 10 http://192.168.50.10/
```

Lakukan pengujian ini saat laptop sedang berada di **luar jaringan LAN rumah** (misalnya memakai tethering HP), supaya kamu yakin koneksi benar-benar melewati Tailscale dan bukan diam-diam lewat Wi-Fi lokal rumah!

### Bagaimana cara kerjanya di belakang layar (SNAT)?
Secara bawaan, Tailscale subnet router melakukan **SNAT** (*Source NAT*). Artinya, bagi perangkat NAS di rumah, permintaan itu terlihat seolah-olah datang langsung dari komputer Debian rumahmu, sehingga NAS tahu harus mengirim balasannya kembali ke Debian (tanpa perlu kamu mengatur *routing* khusus di router Wi-Fi rumah!).

> **Penting soal keamanan:** Koneksi terenkripsi Tailscale hanya melindungi perjalanan data **dari laptopmu sampai ke Debian rumah**. Perjalanan singkat dari Debian ke NAS melalui kabel/Wi-Fi LAN rumah **tidak lagi dibungkus enkripsi Tailscale**—jadi tetap gunakan HTTPS atau protokol terenkripsi lain pada NAS jika datanya sensitif. Jangan juga mematikan fitur SNAT Tailscale kecuali kamu sudah menyiapkan *return route* yang benar di jaringanmu.

## 5. Cara mematikan rute dengan aman

Jika sudah selesai dan rute percobaan ini tidak dipakai lagi:

1. Hentikan iklan rute di Debian (kalau hanya ada rute ini; jika ada rute lain yang masih dipakai, tulis ulang daftar rute yang tersisa alih-alih mengosongkannya):

```bash
sudo tailscale set --advertise-routes=
```

2. Cabut persetujuan rutenya di dasbor **Machines** dan hapus aturan `grants` khusus NAS tersebut.
3. Di laptop Linux, kembalikan `--accept-routes` ke nilai awal (jangan matikan jika laptopmu masih perlu mengakses subnet router lain).
4. **Jangan asal mengembalikan `ip_forward` ke `0`** karena fitur itu mungkin dipakai oleh Exit Node, Docker, atau fungsi router lain. Hanya hapus `/etc/sysctl.d/99-tailscale-routing.conf` dan kembalikan nilai `sysctl` awal jika kamu yakin file itu khusus percobaan ini dan tidak ada layanan lain yang memakainya.
5. Uji lagi dari luar rumah untuk memastikan alamat NAS sudah tidak lagi terjangkau.

## Referensi

- [Subnet routers](https://tailscale.com/docs/features/subnet-routers)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. **Subnet router Tailscale untuk akses jaringan rumah (artikel ini)**
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
