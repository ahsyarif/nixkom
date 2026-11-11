---
title: "Subnet router Tailscale untuk akses jaringan rumah"
date: 2026-11-11T22:06:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","subnet-router","routing"]
description: "Jadikan Debian subnet router Tailscale untuk mengakses perangkat LAN. Atur forwarding, persetujuan rute, grants, dan cara menarik rutenya."
---

Subnet router Tailscale meneruskan koneksi dari tailnet ke jaringan lokal yang bisa dijangkau Debian. Ini berguna untuk NAS atau printer yang tidak bisa dipasangi Tailscale. Kalau perangkat tujuan bisa menjalankan Tailscale sendiri, pemasangan langsung biasanya lebih sederhana dan memberi enkripsi sampai perangkat itu.

Contoh memakai Debian di rumah, NAS `192.168.50.10`, dan LAN `192.168.50.0/24`. Semua alamat LAN itu ilustrasi. Debian harus benar-benar tersambung ke LAN tersebut; VPS di pusat data tidak otomatis bisa menjangkau jaringan rumahmu.

## Periksa jaringan sebelum mengiklankan rute

Di Debian rumah yang sudah [terpasang Tailscale](/posts/tailscale-debian-pemula/):

```bash
ip -4 address
ip -4 route
curl --connect-timeout 5 --max-time 10 http://192.168.50.10/
```

Ganti tujuan dengan layanan LAN yang memang kamu kelola. Jika NAS memakai HTTPS atau port lain, sesuaikan URL; jangan menonaktifkan validasi sertifikat untuk menutupi masalahnya. Debian harus bisa mengakses layanan itu sebelum dijadikan perantara.

Untuk percobaan, iklankan **satu host** `192.168.50.10/32`, bukan seluruh LAN. Pastikan jaringan tempat laptop berada tidak memakai rentang yang bertabrakan. Jika kedua tempat memakai alamat LAN sama, pilih alamat jaringan yang berbeda atau rancangan perutean khusus; mengulang `--accept-routes` tidak menyelesaikan ambiguitas alamat.

## Aktifkan penerusan IP di Debian

Catat nilai awal dan pastikan berkas konfigurasi contoh belum dipakai untuk keperluan lain:

```bash
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
sudo test ! -e /etc/sysctl.d/99-tailscale-routing.conf
```

Jika berkas sudah ada, baca dan sesuaikan isinya, jangan menimpanya. Jika belum ada, buat dengan `sudoedit /etc/sysctl.d/99-tailscale-routing.conf`:

```ini
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
```

Terapkan lalu periksa:

```bash
sudo sysctl -p /etc/sysctl.d/99-tailscale-routing.conf
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
```

Contoh menyiapkan forwarding IPv4 dan IPv6 sesuai panduan Linux Tailscale, tetapi rute yang diiklankan di bawah hanya IPv4. Jika Debian memperoleh rute IPv6 melalui Router Advertisement, periksa pengaturan jaringan sebelum mengaktifkan forwarding IPv6; perubahan mode router bisa memengaruhi penerimaan RA. Siapkan akses konsol untuk memulihkan konektivitas.

Firewall harus tetap menolak forwarding yang tidak dimaksudkan. Jangan mengubah kebijakan umum forwarding menjadi ACCEPT atau mematikan firewall. Tailscale memasang aturan penerusan sendiri pada mode netfilter bawaan; jika ada firewall khusus, periksa jalur Tailscale ke antarmuka LAN dan lalu lintas balasannya secara terarah.

## Iklankan, setujui, lalu beri izin akses

Di Debian router:

```bash
sudo tailscale set --advertise-routes=192.168.50.10/32
```

Opsi tersebut mengganti daftar rute yang diiklankan perangkat. Jika sudah ada rute lain yang dibutuhkan, sertakan semuanya dalam daftar dipisahkan koma; jangan menghapusnya tanpa sengaja.

Buka [Machines](https://console.tailscale.com/admin/machines), pilih Debian, lalu setujui rute pada **Edit route settings**. Persetujuan rute dan izin akses adalah dua hal berbeda. Rute yang disetujui belum tentu boleh dipakai pengguna.

Di kebijakan tailnet, beri laptop izin hanya ke layanan NAS yang diperlukan. Contoh objek grants berikut mengizinkan laptop ilustrasi `100.101.102.10` mengakses HTTP NAS:

```json
{
  "src": ["100.101.102.10"],
  "dst": ["192.168.50.10"],
  "ip": ["tcp:80"]
}
```

Tambahkan objek ke array `grants` yang sudah ada, ganti alamat dan port, serta periksa izin luas lain. Ikuti [panduan grants](/posts/tailscale-grants-pemula/) untuk tes dan pemulihan. Jangan menganggap contoh sempit ini membatasi akses bila allow-all masih aktif.

## Aktifkan penerimaan rute pada klien

Di **laptop Linux**, bukan otomatis pada router:

```bash
sudo tailscale set --accept-routes=true
curl --connect-timeout 5 --max-time 10 http://192.168.50.10/
```

Klien Windows, macOS, Android, dan iOS menerima rute subnet secara bawaan. Periksa pengaturan klien bila sebelumnya pernah dimatikan. Lakukan pengujian dari luar LAN rumah agar koneksi tidak diam-diam memakai jalur lokal.

Secara bawaan, subnet router melakukan SNAT. NAS melihat sumber koneksi sebagai IP LAN Debian sehingga biasanya tidak perlu rute balik khusus. Jalur dari Debian ke NAS tidak dilindungi enkripsi Tailscale; pakai HTTPS atau protokol terenkripsi jika datanya sensitif. Jangan mematikan SNAT tanpa menyiapkan rute balik yang benar.

## Tarik rute tanpa merusak fungsi lain

Jika ini satu-satunya rute yang kamu tambahkan, hentikan iklannya di Debian:

```bash
sudo tailscale set --advertise-routes=
```

Jika ada rute lama, set kembali daftar semula alih-alih mengosongkannya. Cabut persetujuan rute dan izin grants khusus NAS yang tidak dipakai lagi. Di laptop Linux, kembalikan `--accept-routes` ke nilai awal; jangan mematikannya jika masih membutuhkan subnet lain.

Forwarding mungkin dipakai exit node, Docker, atau router lain. Jangan mengembalikannya ke 0 sembarangan. Hanya jika berkas tadi memang khusus percobaan dan tak ada pemakai lain, hapus konfigurasi percobaan lalu kembalikan nilai sysctl awal yang sudah dicatat. Uji lagi bahwa layanan NAS tidak terjangkau lewat rute yang ditarik.

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
