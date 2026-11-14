---
title: "Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR"
date: 2026-11-14T11:05:00+07:00
categories:
  - Infrastructure
  - Git
tags:
  - docker
  - github
  - github-actions
  - ci
  - ghcr
  - pemula
description: Tutorial membuat pipeline Continuous Integration (CI) menggunakan GitHub Actions untuk menjalankan test otomatis pada Pull Request serta mem-build dan push Docker image ke GHCR saat merge ke main.
---

Sekarang kita masuk ke inti **CI (Continuous Integration)**: setiap kali kamu membuka **Pull Request** atau meng-merge kode ke **`main`**, GitHub otomatis menyewakan komputer virtual (*runner* Ubuntu) gratis sementara untuk mengecek kodemu, memastikan `Dockerfile` bisa di-build tanpa error, dan menerbitkan Docker image siap pakai ke **`ghcr.io`**.

---

## Memahami Struktur Pipeline CI yang Cerdas

Jangan mem-build dan meng-upload image ke `ghcr.io` setiap kali orang hanya membuka Pull Request yang masih belum final. Pisahkan pipeline menjadi **dua tahap (`jobs`)**:

1. **Job `test`** — Berjalan di **setiap Pull Request dan Push ke `main`**. Tugasnya menjalankan unit test/linter aplikasi dan memverifikasi bahwa `Dockerfile` bisa di-build (`push: false`). Kalau gagal, seluruh proses berhenti!
2. **Job `build-and-push`** — Hanya berjalan **jika `test` lulus (`needs: test`)** DAN **hanya ketika terjadi `push` ke branch `main`** (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`). Tugasnya mem-build image final, memberi label versi (`latest` dan `sha-...`), lalu mengirimnya ke `ghcr.io`.

---

## Langkah 1: Buat File `.github/workflows/ci-cd.yml`

Di dalam folder proyekmu, buat folder `.github/workflows/` lalu buat file bernama `ci-cd.yml`:

```yaml
name: CI/CD Docker ke VPS

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    name: Jalankan Test & Cek Dockerfile
    runs-on: ubuntu-latest

    steps:
      - name: Ambil kode dari repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: Install dependensi & jalankan tes
        run: |
          npm ci
          npm test

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Uji build Dockerfile (tanpa push)
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false

  build-and-push:
    name: Build & Push Image ke GHCR
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Ambil kode dari repository
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login ke GitHub Container Registry (GHCR)
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Buat tag dan label metadata otomatis
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,format=short,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build & Push Docker image dengan cache
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

*(Catatan: jika aplikasimu menggunakan Python/Go/Laravel, cukup ganti langkah `Setup Node.js` & `npm test` dengan `pytest`, `go test ./...`, atau `php artisan test`. Langkah Docker Buildx, Login GHCR, Metadata, dan Build-Push di bawahnya **persis sama** untuk bahasa apa pun!)*

---

## Bedah Baris Penting YAML (Agar Kamu Benar-Benar Paham)

1. **`permissions: contents: read` dan `packages: write`**  
   Secara bawaan demi keamanan, token workflow kadang hanya diberi izin baca. Baris `packages: write` memberi izin resmi kepada job `build-and-push` untuk mengunggah image baru ke GHCR repository ini.
2. **`images: ghcr.io/${{ github.repository }}`**  
   Jika nama repository-mu misalnya `Ahmad/Aplikasiku`, `docker/metadata-action` otomatis mengubah huruf besar menjadi huruf kecil (`ghcr.io/ahmad/aplikasiku`) karena registry Docker tidak mengizinkan huruf kapital di nama image.
3. **Dua jenis Tag (`sha-xxxxxxx` dan `latest`):**  
   - `type=sha,format=short,prefix=sha-` memberi setiap build label unik sesuai 7 karakter pertama hash commit Git (contoh: `sha-860c190`). Ini yang membuat kita bisa melacak dan melakukan **rollback instan**!
   - `type=raw,value=latest,enable={{is_default_branch}}` juga menandai build terbaru di `main` dengan label `latest`.
4. **`cache-from: type=gha` dan `cache-to: type=gha,mode=max`:**  
   Menyimpan cache layer Docker langsung di *GitHub Actions Cache*. Build pertama mungkin memakan waktu 1–2 menit, namun build berikutnya biasanya jauh lebih cepat (sering hanya belasan detik) karena layer sistem dan dependensi yang tidak berubah langsung diambil dari cache!

---

## Langkah 2: Uji Pipeline CI Lewat Pull Request & Merge

Mari uji alur ini dari laptop:

1. Commit file `.github/workflows/ci-cd.yml` di branch fitur (misalnya `feat/setup-ci`), lalu push ke GitHub dan buka **Pull Request**:
   ```bash
   git switch -c feat/setup-ci
   git add .github/workflows/ci-cd.yml
   git commit -m "Tambah workflow CI test dan build image ke GHCR"
   git push -u origin feat/setup-ci
   ```
2. Buka tab **Actions** di halaman repository GitHub-mu. Kamu akan melihat job **`test`** berjalan (ikon kuning berputar -> hijau centang), sedangkan **`build-and-push`** dilewati (*skipped*, ikon abu-abu) karena masih tahap Pull Request!
3. Sekarang klik **Merge pull request** ke `main`.
4. Buka lagi tab **Actions**: kali ini job `test` berjalan **diikuti oleh `build-and-push`** sampai selesai hijau!

---

## Langkah 3: Lihat Hasil Image di Tab **Packages**

Setelah `build-and-push` berstatus sukses hijau:

1. Buka halaman utama **Repository** (atau **Profil GitHub**-mu) -> klik bagian **Packages** di sidebar kanan.
2. Di sana sekarang muncul paket container bernama `nama-repo` lengkap dengan tag `latest` dan `sha-xxxxxxx`!
3. Di menu **Package settings** sebelah kanan, perhatikan visibilitasnya (*Public* atau *Private*):
   - Jika repository-mu **Public**, biasanya package juga otomatis Public (VPS bisa menariknya tanpa login).
   - Jika repository-mu **Private**, package juga otomatis **Private**—yang berarti nanti di **Bagian 7**, kita perlu satu kali `docker login ghcr.io` di VPS agar VPS boleh mengunduh image privatmu.

---

## Checklist Singkat Sebelum Lanjut

- [x] File `.github/workflows/ci-cd.yml` sudah ter-merge ke `main`.
- [x] Job `test` dan `build-and-push` selesai hijau di tab **Actions**.
- [x] Docker image `ghcr.io/username/nama-repo` beserta tag `sha-...` sudah muncul di menu **Packages** GitHub.

Sekarang image aplikasimu yang sudah teruji tes otomatis duduk manis di GHCR. Di **Bagian 7** (bagian terakhir seri ini), kita akan menyambungkan pipeline tadi ke **CD (Continuous Deployment)** agar VPS otomatis menarik image terbaru dan merestart container secara aman, lengkap dengan panduan **Rollback 1 Menit**.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. **Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR** *(sedang dibaca)*
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [Docker Docs: Introduction to GitHub Actions with Docker](https://docs.docker.com/build/ci/github-actions/)
- [GitHub Docs: Quickstart for GitHub Actions](https://docs.github.com/en/actions/get-started/quickstart)
- [GitHub Docs: Working with the Container registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
