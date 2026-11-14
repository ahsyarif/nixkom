---
title: Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)
date: 2026-11-14T11:04:00+07:00
categories:
  - Git
  - DevOps
tags:
  - git
  - github
  - cicd
  - ghcr
  - workflow
  - pemula
description: Menyiapkan alur kerja Git dan GitHub yang aman sebelum mengaktifkan CI/CD otomatis ke VPS, mulai dari branch fitur, Pull Request, Branch Protection, Secrets, hingga GHCR.
---

Kalau sebuah repository GitHub nantinya terhubung dengan sistem deploy otomatis (**CI/CD**) ke VPS produksi, kebiasaan asal `git add . && git push origin main` bisa berakibat fatal: satu typo kecil di laptopmu langsung membuat server produksi crash di depan pengguna!

Sebelum kita menulis file otomasi GitHub Actions di **Bagian 6**, mari kita rapikan dulu alur kerja **Git & GitHub** serta pengaturan keamanannya.

---

## Analogi Sederhana: Dapur Uji Coba vs Piring yang Disajikan ke Tamu

Anggap branch **`main`** adalah piring makanan siap saji yang langsung diantar ke meja tamu (VPS produksi). Sementara **branch fitur** (misalnya `feat/halaman-login`) adalah dapur uji coba:

- Kamu bebas mencoba resep, salah, lalu memperbaiki lagi di branch fitur tanpa mengganggu tamu di ruang makan.
- Begitu makanan sudah dicicipi dan lolos uji otomatis di GitHub (**Pull Request** + **CI**), barulah hidangan itu digabungkan (*merge*) ke `main` untuk dikirim ke server.

---

## Langkah 1: Alur Harian Git dari Laptop ke GitHub

Setiap kali ingin menambah fitur atau memperbaiki bug, biasakan mengikuti urutan 5 langkah ini:

### 1. Selalu mulai dari `main` yang paling baru

```bash
git switch main
git pull
```

*(Jika belum familiar dengan perintah modern `git switch` atau cara mengintip perubahan server sebelum menggabungnya, baca [berhenti memakai `git checkout` untuk semuanya](/posts/git-switch-restore/) dan [beda `git fetch` dan `git pull`](/posts/git-fetch-vs-pull/).)*

### 2. Buat branch baru khusus untuk pekerjaanmu

```bash
git switch -c feat/tambah-api-produk
```

*(Beri nama branch singkat dan deskriptif, misalnya `feat/...` untuk fitur baru atau `fix/...` untuk perbaikan bug.)*

### 3. Koding & uji lokal memakai Docker Compose

Uji perubahanmu di container lokal seperti yang kita siapkan pada Bagian 4:

```bash
docker compose up --build
```

Pastikan aplikasi, migrasi database, dan unit test berjalan mulus sebelum meng-commit kode.

### 4. Periksa perubahan agar rahasia tidak ikut masuk Git

Sebelum `git commit`, **selalu** jalankan `git status` dan pastikan tidak ada file `.env` atau kunci SSH yang ikut terjaring:

```bash
git status
git add .
git commit -m "Tambah endpoint daftar produk dan unit test"
```

*(Kalau ada perubahan yang belum rapi atau ingin memilih baris tertentu saja untuk di-commit, kamu bisa memakai [`git add -p`](/posts/git-add-patch/) atau [`git commit --amend`](/posts/git-commit-amend/).)*

### 5. Push branch fitur dan buat Pull Request (PR) di GitHub

```bash
git push -u origin feat/tambah-api-produk
```

Buka halaman repository-mu di GitHub -> klik tombol **Compare & pull request** -> tinjau daftar file yang berubah -> klik **Create pull request**.

*(Jika kebetulan ada orang lain yang sudah lebih dulu meng-merge perubahan ke `main` dan muncul konflik file, ikuti langkah tenang menyelesaikannya di [cara menyelesaikan merge conflict](/posts/git-merge-conflict/).)*

---

## Langkah 2: Aktifkan *Branch Protection* pada `main`

Supaya tidak ada siapa pun (termasuk dirimu sendiri saat sedang mengantuk!) yang tidak sengaja mem-push langsung ke `main` melewati uji coba, kunci branch `main` di GitHub:

1. Buka repository di GitHub -> **Settings** -> **Branches**.
2. Klik **Add branch protection rule** (atau gunakan fitur **Rulesets**).
3. Pada *Branch name pattern*, ketik `main`.
4. Centang opsi berikut:
   - **Require a pull request before merging** (mewajibkan semua perubahan masuk lewat Pull Request).
   - **Require status checks to pass before merging** (setelah nanti kita membuat job `test` di Bagian 6, pilih job `test` di daftar ini agar tombol *Merge* terkunci kalau tes gagal!).
5. Klik **Create / Save changes**.

*(Catatan untuk pengguna akun GitHub Free pada repository **Private**: fitur Branch Protection tertentu sebelumnya terbatas untuk repo Public atau akun berbayar, sedangkan di repo Public tersedia gratis sepenuhnya. Jika kamu memakai repo Private di paket Free dan opsi ini terkunci, minimal biasakan dirimu membuat PR sebelum merge ke `main`.)*

---

## Langkah 3: Mengenal *GitHub Secrets* & *GHCR* (`ghcr.io`)

Ada dua konsep penting di GitHub sebelum kita menyentuh YAML CI/CD:

### 1. GitHub Secrets (Brankas Rahasia Workflow)

Password server, IP VPS, atau private SSH key **dilarang keras** ditulis langsung di dalam file `.github/workflows/*.yml` karena file tersebut tersimpan di Git! Sebagai gantinya, simpan di:

**Repository GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret**.

Di sana nanti kita akan menyimpan:
- `VPS_HOST` (alamat IP publik atau IP Tailscale VPS)
- `VPS_USER` (username user deploy di VPS)
- `VPS_SSH_KEY` (private SSH key khusus untuk deployment)

Nilai yang tersimpan di *Secrets* otomatis disensor menjadi `***` apabila tidak sengaja tercetak di log GitHub Actions.

### 2. GitHub Container Registry (`ghcr.io`) & `GITHUB_TOKEN`

Kita tidak perlu repot mendaftar akun Docker Hub tambahan (yang juga punya batas *rate limit* unduhan untuk akun gratis) hanya untuk menyimpan image proyek kita sendiri.

GitHub sudah menyediakan gudang image bawaan bernama **GitHub Container Registry** di alamat **`ghcr.io`**, dengan format nama image:

```text
ghcr.io/username-atau-org/nama-repository
```

Lebih enaknya lagi: saat GitHub Actions berjalan, GitHub otomatis menyediakan token sementara bernama **`GITHUB_TOKEN`**. Dengan memberi izin `packages: write` di file workflow nanti, GitHub Actions langsung boleh mendorong (*push*) Docker image hasil build ke `ghcr.io` milikmu tanpa kamu harus membuat token manual!

---

## Checklist Singkat Sebelum Lanjut

- [x] Proyek lokal sudah terhubung ke repository GitHub (`git remote -v`).
- [x] Sudah terbiasa membuat branch baru (`git switch -c ...`), memeriksa `git status` (memastikan `.env` tidak ikut), dan membuat Pull Request ke `main`.
- [x] Memahami letak menu **Settings -> Secrets and variables -> Actions** dan peran `ghcr.io`.

Di **Bagian 6**, kita akan mulai menulis pipeline **CI (Continuous Integration)** pertama kita di `.github/workflows/ci-cd.yml` untuk menguji kode secara otomatis dan mem-push Docker image ke `ghcr.io`.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. **Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)** *(sedang dibaca)*
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Docs: Working with the Container registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
