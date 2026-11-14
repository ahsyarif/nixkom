---
title: "Catatan Pemula: Container NixOS Deklaratif dan Jaringan WireGuard"
date: 2026-11-07T09:00:00+07:00
categories: ["DevOps", "NixOS", "Server", "Security"]
tags: ["nix", "wireguard", "linux", "containers"]
pin: true
description: "Panduan ringan mengenal cara membuat container ringan di NixOS dan menghubungkannya lewat jaringan privat WireGuard."
---

Jika kamu punya dua server di tempat yang berbeda—misalnya satu di Jakarta dan satu di Singapura—kamu tidak selalu perlu memasang sistem besar dan rumit seperti Kubernetes hanya untuk memisahkan aplikasi dan menghubungkan keduanya secara aman.

Di **NixOS** (sistem operasi Linux yang seluruh pengaturannya ditulis rapi dalam satu berkas konfigurasi), kita bisa menggabungkan dua hal ringan:
1. **Container deklaratif (`containers.<nama>`):** Bayangkan seperti membuat "kamar-kamar terpisah" yang ringan di dalam satu server Linux. Setiap aplikasi berjalan terisolasi di kamarnya sendiri, dan karena sifatnya **deklaratif**, kamu cukup menuliskan konfigurasi yang diinginkan, lalu NixOS membangunnya secara konsisten di server mana pun.
2. **Jaringan WireGuard:** Terowongan VPN modern yang sangat cepat dan ringan untuk menyambungkan antar-server lewat internet seolah-olah keduanya berada di satu jaringan lokal yang sama.

## 1. Gambaran jaringan (topologi)

Dalam rancangan sederhana ini, setiap server punya satu alamat IP di terowongan WireGuard (`10.100.0.0/24`) yang saling terhubung satu-ke-satu (`/32` *peer*), lalu setiap server memiliki rentang IP sendiri untuk kamar *container*-nya masing-masing:

| Server (Node) | IP WireGuard | Subnet Container | Peran |
|---|---|---|---|
| `id-jkt-01` | `10.100.0.1` | `10.200.1.0/24` | Pintu masuk utama (*edge ingress*) |
| `sg-sin-01` | `10.100.0.2` | `10.200.2.0/24` | Layanan inti (*core services*) |

Artinya:
- Jalur `10.100.0.x` adalah jalur terowongan privat antar-server.
- Jalur `10.200.1.x` dipakai oleh container-container di server Jakarta, sedangkan `10.200.2.x` dipakai oleh container di server Singapura, yang saling diarahkan lewat antarmuka WireGuard (`wg0`).

## 2. Contoh konfigurasi NixOS

Berikut contoh cuplikan konfigurasi di NixOS untuk menyalakan antarmuka WireGuard `wg0` sekaligus membuat satu container bernama `metrics` yang menjalankan layanan pemantauan Prometheus:

```nix
{ config, pkgs, ... }: {
  # 1. Pengaturan terowongan WireGuard bernama wg0
  networking.wireguard.interfaces.wg0 = {
    ips = [ "10.100.0.1/24" ];
    listenPort = 51820;
    privateKeyFile = "/run/secrets/wg0.key";
  };

  # 2. Definisi container ringan bernama 'metrics'
  containers.metrics = {
    autoStart = true;
    privateNetwork = true;
    hostAddress = "10.200.1.1";   # Alamat di sisi server induk (host)
    localAddress = "10.200.1.2";  # Alamat di dalam container
    config = { config, pkgs, ... }: {
      services.prometheus.enable = true;
      system.stateVersion = "25.05";
    };
  };
}
```

Mari kita pahami bagian pentingnya:
- **`listenPort = 51820` & `privateKeyFile`:** Port yang dibuka untuk terowongan WireGuard beserta lokasi file kunci rahasianya (jangan menuliskan isi kunci privat langsung di file konfigurasi Nix yang bisa terbaca publik).
- **`autoStart = true`:** Container otomatis menyala saat server dinyalakan.
- **`privateNetwork = true`:** Memberi container jaringan virtual terpisah (`veth`, ibarat kabel jaringan virtual antara server induk dan kamar container) memakai alamat `hostAddress` dan `localAddress`.
- **`config = { ... }`:** Di dalam blok ini kamu menulis pengaturan apa saja yang berjalan di dalam container—pada contoh ini cukup satu baris `services.prometheus.enable = true;` untuk menyalakan Prometheus.

## 3. Cara mengecek setelah diterapkan

Setelah konfigurasi diterapkan, periksa apakah terowongan WireGuard sudah berhasil berjabat tangan (*handshake*—tanda dua server sudah saling terhubung dan bertukar kunci) dan apakah jalur rute menuju kabel virtual container (`veth`) sudah terdaftar:

```bash
sudo wg show wg0
ip route show table main
```

- `sudo wg show wg0` memperlihatkan status koneksi peer WireGuard, termasuk kapan terakhir kali terjadi *handshake* dan seberapa banyak data yang lewat.
- `ip route show table main` menampilkan daftar arah tujuan lalu lintas jaringan yang diketahui server.

> **Tip:** Tekan tombol `/` di halaman mana saja pada blog ini untuk mencari catatan berdasarkan judul, ringkasan, atau tag.
