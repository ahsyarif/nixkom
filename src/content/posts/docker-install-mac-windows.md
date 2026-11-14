---
title: Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal
date: 2026-11-14T11:02:00+07:00
categories:
  - DevOps
tags:
  - docker
  - windows
  - wsl2
  - macos
  - pemula
description: Tutorial memasang Docker di Windows 10/11 menggunakan WSL 2 dan di macOS (Apple Silicon maupun Intel), beserta tips krusial agar performa file lokal tetap cepat.
---

Di Linux, Docker berjalan langsung di atas kernel Linux host. Namun bagaimana dengan **Windows** dan **macOS**?

Karena container Docker standar membutuhkan kernel Linux, Docker tidak bisa berjalan "telanjang" di atas kernel Windows maupun kernel Darwin milik macOS. Di balik layar, aplikasi seperti **Docker Desktop** diam-diam menjalankan **mesin virtual (VM) Linux super ringan** agar seluruh container-mu tetap berjalan konsisten persis seperti di VPS Linux!

Di bagian ini kita akan memasangnya dengan konfigurasi paling kencang dan nyaman dipakai untuk alur development menuju VPS.

---

## Pilihan A: Install Docker di Windows 10 / 11 (Wajib Pakai WSL 2)

Jangan pakai mode lama (Hyper-V/Windows containers) kecuali punya alasan khusus. Untuk alur development menuju VPS Linux, **WSL 2 (Windows Subsystem for Linux 2)** adalah standar terbaik karena memberi kamu terminal Ubuntu Linux sungguhan langsung di dalam Windows.

### Langkah 1: Pasang WSL 2

1. Pastikan Windows-mu adalah Windows 10 (64-bit, versi 22H2 atau lebih baru) atau Windows 11.
2. Pastikan fitur virtualisasi CPU (Intel VT-x / AMD-V) aktif di BIOS/UEFI (umumnya sudah aktif di laptop modern).
3. Klik Start -> ketik **PowerShell** -> klik kanan -> **Run as Administrator**, lalu jalankan:
   ```powershell
   wsl --install
   ```
   Perintah ini otomatis mengaktifkan komponen WSL 2 dan mengunduh distro **Ubuntu** sebagai bawaan.
4. **Restart komputer** ketika diminta, lalu buka kembali aplikasi **Ubuntu** dari Start Menu untuk membuat username dan password Linux pertamamu.
5. Cek di PowerShell untuk memastikan Ubuntu sudah memakai **VERSION 2**:
   ```powershell
   wsl -l -v
   ```

### Langkah 2: Pasang Docker Desktop for Windows

1. Unduh installer resmi **Docker Desktop for Windows** dari situs Docker.
2. Jalankan installer `.exe` dan **pastikan opsi *Use WSL 2 instead of Hyper-V* dicentang**.
3. Setelah selesai, buka aplikasi Docker Desktop dan setujui syarat penggunaannya.
4. Masuk ke menu **Settings** (ikon roda gigi) -> **Resources** -> **WSL integration**, lalu pastikan sakelar **Enable integration with my default WSL distro** dan distro **Ubuntu** dalam keadaan **ON**. Klik **Apply & restart**.

### Aturan Emas Performa di Windows + WSL 2

Ini jebakan nomor satu pengguna Windows: **jangan taruh folder kodinganmu di drive Windows (`C:\Users\Nama\Projects` atau `/mnt/c/...`)!**

Kenapa? Membaca ribuan file `node_modules` atau `vendor` lintas batas Windows -> WSL (`/mnt/c/...`) sangat lambat dan sering membuat *hot-reload* gagal mendeteksi perubahan file.

**Cara yang benar:** Buka terminal **Ubuntu (WSL)** dan simpan semua proyek Git/Docker-mu di dalam home directory Linux:

```bash
mkdir -p ~/projects
cd ~/projects
```

Di VS Code, cukup pasang ekstensi **WSL** milik Microsoft, lalu jalankan `code .` dari terminal Ubuntu WSL! Terminal, Git, SSH key, dan Docker-mu sekarang 100% terasa seperti bekerja di Linux asli.

---

## Pilihan B: Install Docker di macOS (Apple Silicon & Intel)

### Langkah 1: Pilih Installer Sesuai Chip Mac-mu

Sebelum mengunduh dari situs Docker, cek dulu chip Mac-mu lewat menu Apple (kiri atas) -> **About This Mac**:

- Jika tertulis **Apple M1 / M2 / M3 / M4** -> unduh **`Docker.dmg` for Mac with Apple silicon**.
- Jika tertulis **Intel Core i5/i7/i9** -> unduh **`Docker.dmg` for Mac with Intel chip**.

*(Alternatif cepat bagi pengguna Homebrew: kamu bisa menginstal langsung dengan perintah `brew install --cask docker`, lalu buka aplikasinya dari folder Applications.)*

### Langkah 2: Pemasangan & Optimasi Performa File Sharing

1. Buka file `Docker.dmg` yang sudah diunduh, lalu seret ikon paus **Docker** ke folder **Applications**.
2. Buka **Docker** dari Applications (atau Spotlight), izinkan akses sistem jika diminta macOS, dan tunggu ikon paus di menu bar kanan atas berhenti beranimasi.
3. Buka **Settings** -> **General** di Docker Desktop, pastikan kedua opsi modern ini aktif (biasanya sudah aktif di versi baru):
   - **Virtual Machine Options:** `Apple Virtualization framework` (di macOS 13+).
   - **File sharing implementation:** `VirtioFS` — ini jauh lebih cepat dibandingkan gRPC FUSE atau osxfs lama saat container membaca kode dari disk Mac.

### Catatan Singkat: Alternatif Ringan & Lisensi Docker Desktop

Perlu diketahui secara jujur: **Docker Desktop** gratis untuk penggunaan pribadi, belajar, proyek open-source, dan usaha kecil (di bawah batas karyawan/pendapatan tertentu sesuai ketentuan Docker). Jika kamu bekerja di perusahaan besar yang terkena aturan lisensi berbayar Docker Desktop, atau sekadar ingin runtime yang lebih hemat baterai dan RAM di Mac, dua alternatif populer yang kompatibel dengan perintah `docker` dan `docker compose` adalah:

- **Colima** (open-source gratis lewat Homebrew):
  ```bash
  brew install colima docker docker-compose
  colima start
  ```
- **OrbStack** (berbayar untuk penggunaan komersial tertentu, sangat ringan di macOS).

*(Sepanjang sisa seri ini, semua perintah `docker` dan `docker compose` bekerja sama persis baik kamu memakai Docker Desktop, Colima, maupun Docker Engine Linux.)*

---

## Verifikasi Akhir di Terminal (Windows WSL & macOS)

Buka terminal **Ubuntu (WSL)** di Windows atau **Terminal / iTerm2** di macOS, lalu jalankan:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Catatan penting tentang arsitektur Mac Apple Silicon (`arm64`) vs mayoritas VPS (`amd64` / `x86_64`):  
Di Mac M1–M4, `docker build` lokal secara default membuat image `linux/arm64` agar super cepat di laptopmu. **Jangan khawatir soal kecocokan ke VPS:** nanti di **Bagian 6**, build produksi dilakukan oleh runner **GitHub Actions (`ubuntu-latest`)** yang langsung menghasilkan image sesuai arsitektur VPS-mu (`linux/amd64` atau *multi-arch*), bukan dari laptop Mac-mu!

---

## Checklist Singkat Sebelum Lanjut

- [x] Di Windows: WSL 2 aktif (`wsl -l -v` versi 2), integrasi WSL di Docker Desktop aktif, dan proyek disimpan di `~/projects` Linux WSL.
- [x] Di macOS: Docker Desktop (atau Colima) terpasang sesuai arsitektur chip dan status daemon berjalan.
- [x] Perintah `docker --version`, `docker compose version`, dan `docker run --rm hello-world` berjalan sukses di terminal.

Sekarang semua OS—baik laptopmu maupun VPS Linux—sudah punya Docker siap pakai. Di **Bagian 4**, kita akan menyiapkan proyek lokal yang rapi lengkap dengan `Dockerfile` multi-stage, `.dockerignore`, dan pemisahan `compose.yaml` lokal vs produksi.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. **Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal** *(sedang dibaca)*
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [Docker Docs: Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Docs: WSL 2 backend on Windows](https://docs.docker.com/desktop/features/wsl/)
- [Docker Docs: Install Docker Desktop on Mac](https://docs.docker.com/desktop/setup/install/mac-install/)
