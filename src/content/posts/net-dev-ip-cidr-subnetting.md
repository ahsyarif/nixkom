---
title: "IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer"
date: 2026-11-19T13:00:00+07:00
categories:
  - Networking
  - DevOps
  - Server
tags:
  - networking
  - ip
  - cidr
  - subnet
  - devops
  - pemula
description: "Memahami notasi CIDR (/8, /16, /24, /32, 0.0.0.0/0), rentang IP privat RFC 1918 dan CGNAT, serta perbedaan IP loopback (127.0.0.1) vs IP privat vs IP publik bagi Developer dan DevOps."
---

Sebagai Developer atau DevOps engineer, kamu pasti hampir setiap minggu bertemu angka-angka seperti `10.0.0.0/16`, `192.168.1.0/24`, `100.64.0.0/10`, `203.0.113.10/32`, atau `0.0.0.0/0` saat mengatur firewall, Docker network, Kubernetes, maupun VPC di cloud.

Banyak orang langsung menghafal atau menyalin angka tersebut tanpa benar-benar mengerti artinya—padahal salah satu angka di belakang garis miring (`/`) bisa membuat seluruh jaringan Docker bentrok dengan Wi-Fi kantor, atau tidak sengaja membuka database ke seluruh dunia!

Di bagian pertama seri jaringan terapan untuk Developer & DevOps ini, kita bedah IP, subnetting praktis, dan CIDR tanpa matematika yang bikin pusing.

---

## 1. Anatomi Alamat IPv4 dalam 30 Detik

Sebuah alamat IPv4 (misalnya `192.168.1.25`) terdiri dari **4 angka** (*oktet*) yang dipisahkan titik. Masing-masing angka punya ukuran **8 bit** (bernilai `0` sampai `255`). Total panjang satu alamat IPv4 adalah:

`8 + 8 + 8 + 8 = 32 bit`.

Kenapa angka `32` ini penting? Karena itulah dasar dari notasi **CIDR** (*Classless Inter-Domain Routing*)!

---

## 2. Memahami Notasi CIDR (`/32`, `/24`, `/16`, `/0`) dengan Analogi Kode Pos

Notasi `/N` setelah alamat IP memberi tahu komputer: **berapa banyak bit dari sebelah kiri yang menjadi "nama komplek/jalan" (Network)**, dan **sisanya menjadi "nomor rumah" (Host)**!

Semakin **besar** angka setelah `/`, semakin **kecil** jumlah alamat yang tercakup:

| Notasi CIDR | Bagian Tetap vs Berubah | Jumlah Total Alamat | Arti Praktis di Dunia DevOps |
| --- | --- | --- | --- |
| **`/32`** (`203.0.113.10/32`) | Semua 4 angka dikunci | **1 IP saja** | Menunjuk **tepat 1 komputer/IP** (misal aturan firewall: *izinkan SSH hanya dari IP kantor `203.0.113.10/32`!*). |
| **`/24`** (`192.168.1.0/24`) | 3 angka awal tetap (`192.168.1.x`) | **256 alamat** (`254` bisa dipakai host) | Ukuran paling populer untuk **1 subnet LAN rumah/kantor atau 1 subnet VPC** (dari `.1` s.d. `.254`; `.0` dan `.255` dicadangkan!). |
| **`/16`** (`10.20.0.0/16`) | 2 angka awal tetap (`10.20.x.y`) | **65.536 alamat** | Ukuran klasik untuk **1 VPC Cloud** (AWS/GCP/Azure) atau jaringan default Docker bridge! |
| **`/8`** (`10.0.0.0/8`) | 1 angka awal tetap (`10.x.y.z`) | **16,7 juta alamat** | Blok super besar untuk infrastruktur jaringan perusahaan raksasa. |
| **`/0`** (`0.0.0.0/0`) | Tidak ada yang dikunci | **Seluruh IPv4 di internet!** | Artinya **"Dari mana saja / ke mana saja"**. Wajib hati-hati jika dipakai di firewall masuk (*Ingress*)! |

*(Trik hafalan cepat untuk Developer: kurangi `32` dengan angka CIDR -> `32 - 24 = 8 bit` -> `2⁸ = 256 alamat`. Untuk `/28` misalnya: `32 - 28 = 4 bit` -> `2⁴ = 16 alamat`!)*

---

## 3. IP Publik vs IP Privat (`RFC 1918`) vs Loopback vs CGNAT

Tidak semua IP boleh langsung diarahkan di internet terbuka. Developer wajib mengenali empat kategori alamat IP ini supaya tidak bingung saat debugging:

### A. IP Privat (`RFC 1918`) — Tidak Bisa Diakses Langsung dari Internet

Internet menyepakati 3 blok khusus yang hanya boleh dipakai di jaringan internal (Wi-Fi rumah, LAN kantor, Docker, Cloud VPC):

1. **`10.0.0.0/8`** (`10.0.0.0` – `10.255.255.255`) -> favorit Cloud VPC (AWS, GCP) dan Kubernetes pod network.
2. **`172.16.0.0/12`** (`172.16.0.0` – `172.31.255.255`) -> favorit **Docker bridge network** (`172.17.0.0/16`, `172.18.0.0/16`, dst.).
3. **`192.168.0.0/16`** (`192.168.0.0` – `192.168.255.255`) -> favorit router Wi-Fi rumah dan kantor.

**Pelajaran penting untuk DevOps:** Jangan pernah membuat VPN kantor memakai `192.168.1.0/24`! Karena 90% router Wi-Fi rumah karyawanmu juga memakai `192.168.1.0/24`—akibatnya saat kerja remote (*WFH*), laptop bingung menentukan apakah `192.168.1.10` itu printer di rumah atau server kantor (*subnet collision*)!

### B. IP Loopback (`127.0.0.0/8`, Biasanya `127.0.0.1`)

Alamat **"diri sendiri"** (*localhost*). Paket yang dikirim ke `127.0.0.1` **tidak pernah keluar** ke kartu jaringan atau internet. *(Ingat: di dalam container Docker, `127.0.0.1` menunjuk ke container itu sendiri, bukan ke VPS host atau container sebelah!)*

### C. CGNAT / Shared Address Space (`100.64.0.0/10`)

Rentang IP privat khusus (`100.64.0.0` – `100.127.255.255`) yang dirancang agar ISP (dan juga VPN overlay modern seperti **Tailscale!**) tidak pernah bentrok dengan IP privat `192.168.x.x` atau `10.x.x.x` milik jaringan rumah/cloud!

### D. IP Publik

Alamat unik di seluruh internet terbuka (contoh dokumentasi resmi RFC 5737: `203.0.113.10`). IP inilah yang dipasang di interface publik VPS atau Load Balancer agar pengunjung dunia bisa mengakses website-mu.

---

## Peta Jalan Seri Jaringan Komputer untuk Developer & DevOps

1. **IP Address, CIDR (`/24`, `/16`, `/32`), & IP Publik vs Privat** *(sedang dibaca)*
2. **Routing, Default Gateway, NAT, & Port Forwarding** — Bagaimana paket keluar dari laptop/container ke internet dan kembali lagi.
3. **DNS Praktis untuk Produksi** — Memahami `A`, `AAAA`, `CNAME`, `TXT`, `TTL`, apex domain, internal Docker/cloud DNS, dan migrasi server tanpa downtime.
4. **Port, Socket, Binding (`127.0.0.1` vs `0.0.0.0`), & Firewall Dasar** — Mengatasi kenapa app lokal tak bisa diakses dari luar dan cara kerja firewall stateful.
5. **Reverse Proxy, Load Balancer, & TLS Termination** — Kenapa app produksi butuh Nginx/Caddy/ALB di depannya plus jebakan header `X-Forwarded-*`.
6. **Jaringan Container Docker & Cloud VPC** — Memahami `bridge` vs `host` di Docker dan arsitektur `Public` vs `Private Subnet` + `NAT Gateway`.
7. **Jaringan di Mata Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi** — Masalah aplikasi modern yang sering dikira bug backend padahal masalah jaringan!

---

## Seri Jaringan Komputer Dasar untuk Developer & DevOps

1. **Bagian 1 — IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer** *(sedang dibaca)*
2. [Bagian 2 — Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer](/posts/net-dev-routing-gateway-nat/)
3. [Bagian 3 — DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman](/posts/net-dev-dns-produksi-ttl/)
4. [Bagian 4 — Port, Socket, Binding (127.0.0.1 vs 0.0.0.0), & Cara Kerja Firewall](/posts/net-dev-port-socket-binding-firewall/)
5. [Bagian 5 — Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*](/posts/net-dev-reverse-proxy-load-balancer/)
6. [Bagian 6 — Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)](/posts/net-dev-jaringan-docker-vpc-cloud/)
7. [Bagian 7 — Jaringan di Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi](/posts/net-dev-cors-cdn-latensi-aplikasi/)

---

## Referensi

- [IETF RFC 1918: Address Allocation for Private Internets](https://datatracker.ietf.org/doc/html/rfc1918)
- [IETF RFC 4632: Classless Inter-domain Routing (CIDR)](https://datatracker.ietf.org/doc/html/rfc4632)
