---
title: "Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)"
date: 2026-11-19T13:05:00+07:00
categories:
  - Networking
  - DevOps
  - Server
tags:
  - networking
  - docker
  - vpc
  - cloud
  - devops
  - pemula
description: "Memahami bagaimana container Docker saling berkomunikasi lewat Bridge vs Host network (termasuk jebakan localhost antar container) serta desain Public dan Private Subnet di Cloud VPC."
---

Begitu aplikasi keluar dari laptop masuk ke **Docker** dan **Cloud (AWS, GCP, Azure, DigitalOcean)**, konsep jaringan terasa seperti "kotak ajaib". Padahal jika kamu menyambungkan ilmu IP, CIDR, Routing, dan NAT dari Bagian 1 sampai 4, cara kerja jaringan container dan cloud sangatlah masuk akal!

---

## Bagian 1: Bagaimana Jaringan Docker Bekerja?

Saat kamu menjalankan beberapa container dengan `docker compose up`, setiap container punya **Network Namespace** sendiri—artinya masing-masing container merasa punya kartu jaringan dan alamat `127.0.0.1` (`localhost`) sendiri yang terpisah dari VPS host maupun container lain!

### Jebakan Nomor 1 Pemula Docker: `ECONNREFUSED 127.0.0.1:5432`

Di laptop tanpa Docker, aplikasi Node.js menghubungi database di `localhost:5432` dan langsung tersambung. Tetapi begitu dimasukkan ke container Docker terpisah (`app` dan `db`), koneksi ke `127.0.0.1:5432` **selalu gagal**!

**Kenapa?** Karena dari dalam container `app`, `127.0.0.1` berarti **"di dalam container `app` itu sendiri"**, sedangkan PostgreSQL tinggal di tetangga sebelah (`container db`)!

**Solusinya:** Gunakan jaringan **User-Defined Bridge** (yang otomatis dibuat oleh `docker compose`), lalu panggil nama service-nya: `postgres://user:pass@db:5432/namadb`. Docker otomatis menerjemahkan `db` ke IP internal container database!

### Perbandingan Mode Jaringan Docker Paling Populer

| Driver Network Docker | Cara Kerja | Kelebihan | Kekurangan / Kapan Dipakai |
| --- | --- | --- | --- |
| **Bridge (Default / Custom)** | Membuat switch virtual internal (misal `172.18.0.0/16`) di host. Container di jaringan custom yang sama bisa saling memanggil lewat **nama service**. | Terisolasi rapi, tidak saling bentrok port internal antar proyek, aman untuk produksi! | Untuk menghubungi service yang berjalan langsung di host VPS (di luar container), perlu `host.docker.internal` (di Linux butuh `extra_hosts: ["host.docker.internal:host-gateway"]`). |
| **Host (`network_mode: host`)** | Container tidak diisolasi jaringannya—langsung berbagi kartu jaringan & `localhost` milik VPS host! | Tidak ada overhead NAT sama sekali. | Port container langsung terbuka di IP host dan gampang bentrok antar container (hanya cocok untuk kasus khusus di Linux, tidak didukung sama di Docker Desktop Mac/Windows). |
| **None** | Container sama sekali tidak punya kartu jaringan keluar (hanya `lo`). | Isolasi keamanan maksimal. | Hanya untuk skrip olah data offline tanpa internet/API. |

*(Tips DevOps: Jangan pakai network `bridge` bawaan bernama `docker0` kalau menjalankan beberapa container manual lewat `docker run`, karena `docker0` default tidak punya DNS resolusi nama antar-container! Selalu buat network custom `docker network create net-ku` atau gunakan `docker compose`.)*

---

## Bagian 2: Desain Jaringan Cloud Modern (VPC: Public vs Private Subnet)

Saat beralih dari 1 VPS tunggal ke arsitektur Cloud (seperti AWS VPC, Google Cloud VPC, atau DigitalOcean VPC), kamu membagi satu blok CIDR besar (misal **`10.0.0.0/16`**) menjadi dua jenis lingkungan (**Subnet**):

```text
Internet Publik
      │
      ▼  (Internet Gateway / IGW)
┌────────────────────────────────────────────────────────┐
│ PUBLIC SUBNET (misal 10.0.1.0/24)                      │
│  ├── Load Balancer / Reverse Proxy (punya IP Publik)   │
│  └── NAT Gateway (jembatan keluar untuk Private Subnet)│
└──────────────────────────┬─────────────────────────────┘
                           │ (hanya lewat Security Group terizin!)
                           ▼
┌────────────────────────────────────────────────────────┐
│ PRIVATE SUBNET (misal 10.0.2.0/24)                     │
│  ├── Server Aplikasi Backend (TANPA IP Publik!)        │
│  ├── Database PostgreSQL / Redis (TANPA IP Publik!)    │
│  └── Worker / Queue (akses internet keluar via NAT GW) │
└────────────────────────────────────────────────────────┘
```

### Kenapa Pemisahan Public vs Private Subnet Sangat Penting?

1. **Database & Backend di *Private Subnet* Tidak Punya IP Publik Sama Sekali!**  
   Sekalipun suatu hari ada orang salah mengatur satu aturan firewall di server database, hacker di internet **secara fisik rute tidak punya jalan menuju `10.0.2.x`** karena server itu tidak punya IP publik maupun rute langsung dari *Internet Gateway*!
2. **Lalu Bagaimana Server di *Private Subnet* Bisa `apt update` atau Panggil API Luar?**  
   Melalui **NAT Gateway** yang berdiri di *Public Subnet*: server privat bisa memulai koneksi **keluar** (*Outbound*) untuk mengunduh update keamanan atau memanggil API pembayaran, tetapi orang luar dari internet **tidak pernah bisa memulai koneksi masuk** (*Inbound*) ke server privat!
3. **Lalu Bagaimana Admin Masuk ke Server di *Private Subnet*?**  
   Tidak membuka SSH publik! Gunakan **VPN privat** (seperti WireGuard / Tailscale subnet router), **Bastion Host / Jump Server**, atau fitur modern seperti **AWS Systems Manager (SSM) Session Manager**.

---

## Checklist Singkat Sebelum Lanjut

- [x] Paham kenapa `localhost` di dalam container tidak menunjuk ke container lain dan selalu memakai custom bridge / `docker compose` DNS (`db`, `redis`).
- [x] Mengerti arsitektur **Public Subnet** (Load Balancer & NAT Gateway) vs **Private Subnet** (App & Database tanpa IP publik).
- [x] Paham cara server di *Private Subnet* mengunduh update ke internet lewat NAT Gateway tanpa membuka pintu masuk publik.

Di **Bagian 7** (artikel penutup seri ini), kita membahas empat topik jaringan yang langsung menentukan pengalaman pengguna akhir dan bug paling sering di browser: **CORS, CDN & HTTP Caching, Connection Pooling, dan Dampak Latensi Jaringan (RTT)**!

---

## Seri Jaringan Komputer Dasar untuk Developer & DevOps

1. [Bagian 1 — IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer](/posts/net-dev-ip-cidr-subnetting/)
2. [Bagian 2 — Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer](/posts/net-dev-routing-gateway-nat/)
3. [Bagian 3 — DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman](/posts/net-dev-dns-produksi-ttl/)
4. [Bagian 4 — Port, Socket, Binding (127.0.0.1 vs 0.0.0.0), & Cara Kerja Firewall](/posts/net-dev-port-socket-binding-firewall/)
5. [Bagian 5 — Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*](/posts/net-dev-reverse-proxy-load-balancer/)
6. **Bagian 6 — Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)** *(sedang dibaca)*
7. [Bagian 7 — Jaringan di Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi](/posts/net-dev-cors-cdn-latensi-aplikasi/)

---

## Referensi

- [Docker Docs: Docker networking overview](https://docs.docker.com/engine/network/)
- [Docker Docs: Bridge network driver](https://docs.docker.com/engine/network/drivers/bridge/)
- [IETF RFC 1918: Address Allocation for Private Internets](https://datatracker.ietf.org/doc/html/rfc1918)
