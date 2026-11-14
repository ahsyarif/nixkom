---
title: Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS
date: 2026-11-14T11:00:00+07:00
categories:
  - Infrastructure
  - Linux
  - Git
tags:
  - docker
  - git
  - github
  - cicd
  - vps
  - pemula
description: Memahami kenapa Docker menyelesaikan masalah klasik perbedaan laptop dan server, serta peta lengkap alur development modern dari lokal ke VPS menggunakan Git, GitHub, CI, dan CD.
---

Hampir semua developer pemula pernah mengalami momen menyebalkan ini:

> *"Di laptopku aplikasinya jalan lancar jaya. Kenapa begitu di-upload ke VPS malah langsung error?"*

Penyebabnya hampir selalu sama: versi Node.js/Python/PHP di VPS berbeda dengan laptopmu, ada paket sistem operasi yang lupa di-install, atau ada konfigurasi manual yang sempat kamu ubah dulu di server dan tidak pernah dicatat di mana pun.

Ditambah lagi kalau cara deploy-mu masih manual—SSH ke server, `git pull`, `npm install`, restart proses, lalu lupa langkah ketiga—sekali saja terburu-buru, website langsung tumbang.

Di seri ini, kita akan membereskan kedua masalah tersebut sekaligus dari nol:

1. **Memasang Docker dengan benar di berbagai sistem operasi** (Linux, macOS, dan Windows WSL 2).
2. **Membangun alur kerja modern (*workflow*) dari laptop ke VPS** menggunakan **Git**, **GitHub**, **CI (Continuous Integration)**, dan **CD (Continuous Deployment)**.

---

## Analogi Sederhana: Kotak Kontainer Pengiriman

Bayangkan dunia logistik sebelum ditemukannya kontainer kargo besi standar: setiap barang harus dibongkar-pasang manual saat pindah dari truk ke kapal, sering rusak, tertukar, atau tidak muat.

**Docker** bekerja persis seperti **kontainer kargo** untuk perangkat lunak:

- **Dockerfile (Resep / Cetak Biru):** Daftar instruksi tertulis berisi sistem operasi dasar, runtime (misalnya Node.js 22 atau Python 3.12), library pendukung, dan kode aplikasimu.
- **Docker Image (Cetakan Beku Siap Pakai):** Hasil akhir dari `Dockerfile` setelah di-build. Isinya sudah lengkap, rapi, dan identik baik dibuka di macOS, Windows, maupun VPS Ubuntu/Debian.
- **Docker Container (Aplikasi yang Sedang Berjalan):** Instansi hidup dari sebuah *Image*. Kamu bisa menjalankan 1 atau 10 container dari image yang sama dengan perilaku yang konsisten.
- **Docker Compose (Pengatur Orkestra):** File `compose.yaml` yang menjalankan beberapa container sekaligus—misalnya backend web + database PostgreSQL + Redis—hanya dengan satu perintah `docker compose up`.

---

## Peta Lengkap Alur Development: Lokal -> Git -> GitHub -> CI/CD -> VPS

Supaya kamu tidak tersesat di istilah teknis, lihat alur perjalanan satu fitur baru dari laptopmu sampai tampil live di VPS:

```text
1. LAPTOP LOKAL (macOS / Windows WSL 2 / Linux)
   └── Koding & uji coba memakai Docker Compose agar identik dengan server
         │
         ▼  git commit & git push ke branch fitur
2. GITHUB (Repository & Pull Request)
   └── Simpan riwayat kode + ulas perubahan sebelum masuk branch main
         │
         ▼  merge ke main memicu GitHub Actions
3. CI — CONTINUOUS INTEGRATION (GitHub Actions)
   ├── Jalankan test & linter otomatis (gagal = stop di sini!)
   └── Build Docker Image -> kirim ke GHCR (ghcr.io)
         │
         ▼  build sukses memicu tahap deploy
4. CD — CONTINUOUS DEPLOYMENT (Ke VPS via SSH / Tailscale)
   └── VPS menarik image siap pakai (docker compose pull)
       lalu mengganti container lama dengan versi baru (docker compose up -d)
```

Mari kita terjemahkan tiap singkatan penting di atas dengan bahasa manusia:

- **CI (Continuous Integration):** Kebiasaan menggabungkan perubahan kode sesering mungkin ke repository pusat (GitHub) sambil menjalankan **pengujian dan pembangunan (build) otomatis** di mesin virtual GitHub. Tujuannya menangkap bug lebih cepat sebelum sempat naik ke server asli.
- **Container Registry (`ghcr.io` / GitHub Container Registry):** Gudang penyimpanan Docker Image yang sudah jadi. Daripada menyuruh VPS mem-build kode dari awal, lebih hemat mem-build di GitHub Actions lalu menyimpannya di `ghcr.io`.
- **CD (Continuous Deployment):** Tahap lanjutan setelah build sukses—skrip otomatis menyuruh VPS mengambil image terbaru dari `ghcr.io` dan menyalakan ulang container aplikasi tanpa kamu harus mengetik perintah deploy manual tiap hari.

---

## Kenapa Build Image di GitHub Actions, Bukan Langsung di VPS?

Pemula sering bertanya: *"Kenapa tidak SSH saja ke VPS, `git pull`, lalu `docker compose up --build` di sana?"*

Cara itu memang bisa jalan untuk proyek iseng, tetapi memiliki tiga kekurangan nyata saat proyek mulai serius:

1. **VPS kecil gampang kehabisan RAM (`OOM`).** Proses kompilasi aplikasi modern (Next.js, Vite, Rust, Go, atau `pip`/`npm`) sangat boros RAM dan CPU. Jika dijalankan langsung di VPS harga ekonomis (RAM 1–2 GB), website yang sedang dipakai pengunjung bisa ikut macet atau crash! Dengan build di **GitHub Actions**, server GitHub-lah yang bekerja keras; VPS-mu tinggal mengunduh image matang (`pull`) dalam hitungan detik.
2. **Build pasti identik dan bisa di-rollback instan.** Setiap commit menghasilkan image berlabel unik (misalnya `sha-a1b2c3d`). Jika rilis terbaru ternyata punya bug, kamu cukup menarik tag commit sebelumnya dan aplikasi kembali seperti semula dalam kurang dari 1 menit.
3. **Kode rahasia lebih rapi.** VPS produksi tidak selalu butuh seluruh riwayat `.git` atau build tools di dalamnya—cukup file `compose.prod.yaml` dan `.env` produksi saja.

---

## Yang Akan Kamu Pelajari di 7 Bagian Seri Ini

1. **Arsitektur Docker & Peta Alur CI/CD** *(artikel ini)* — Memahami alur lokal ke VPS tanpa istilah membingungkan.
2. **Install Docker Engine di Linux** — Panduan lengkap Ubuntu, Debian, Fedora, dan RHEL/Rocky/AlmaLinux beserta setup grup `docker` yang aman.
3. **Install Docker di Windows (WSL 2) & macOS** — Langkah memasang Docker Desktop (dan tip krusial agar performa file tidak lemot di Windows/Mac).
4. **Menyiapkan Proyek Lokal dengan `Dockerfile` & `docker-compose.yml`** — Menulis *multi-stage build* ramping, `.dockerignore`, dan memisahkan config lokal vs produksi.
5. **Alur Git & GitHub yang Sehat** — Pola branch, Pull Request, `.gitignore` untuk `.env`, *Branch Protection*, dan mengenal `GITHUB_TOKEN` + GHCR.
6. **Membangun Pipeline CI dengan GitHub Actions** — Membuat `.github/workflows/ci-cd.yml` untuk test otomatis, build image, caching Buildx, dan push ke `ghcr.io`.
7. **Continuous Deployment (CD) ke VPS & Rollback Aman** — Menyiapkan user deploy, SSH key / opsi privat via Tailscale, deploy otomatis ke VPS, hingga cara rollback cepat.

Siap? Di **Bagian 2**, kita mulai memasang Docker secara resmi dan bersih di sistem operasi **Linux** (baik untuk laptop developer Linux maupun untuk VPS produksimu).

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. **Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS** *(sedang dibaca)*
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [Docker Docs: Docker Compose getting started](https://docs.docker.com/compose/gettingstarted/)
- [Docker Docs: Introduction to GitHub Actions with Docker](https://docs.docker.com/build/ci/github-actions/)
- [GitHub Docs: Working with the Container registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
