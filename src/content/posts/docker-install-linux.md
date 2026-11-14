---
title: Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)
date: 2026-11-14T11:01:00+07:00
categories:
  - Infrastructure
  - Linux
tags:
  - docker
  - linux
  - ubuntu
  - debian
  - fedora
  - vps
  - pemula
description: Tutorial memasang Docker Engine resmi beserta Docker Compose v2 di Ubuntu, Debian, Fedora, RHEL, Rocky Linux, dan AlmaLinux lengkap dengan setup grup docker dan verifikasi.
---

Di Linux—baik untuk laptop kerjamu maupun untuk **VPS produksi**—kita tidak memasang Docker Desktop yang berat. Kita memasang **Docker Engine** langsung di atas sistem operasi sehingga sangat ringan, cepat, dan hemat RAM.

> **Penting sebelum mulai:** Banyak distro Linux menyediakan paket bernama `docker.io` di repositori bawaan. Paket tersebut sering tertinggal jauh versinya dan tidak menyertakan plugin terbaru **Docker Compose v2 (`docker compose`)**. Di panduan ini, kita memasang langsung dari **repositori resmi Docker**.

---

## Langkah 0: Bersihkan Paket Docker Lama yang Bisa Bentrok

Jika server atau laptop Linux-mu pernah dipasangi `docker.io`, `docker-compose`, atau paket kompatibel seperti `podman-docker`, hapus dulu paket lama tersebut agar tidak bentrok dengan repositori resmi Docker.

*(Catatan: container dan volume yang sudah ada di `/var/lib/docker` biasanya tidak otomatis terhapus, tetapi tetap biasakan backup dulu jika sudah ada data penting.)*

- **Untuk Ubuntu / Debian:**
  ```bash
  for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    sudo apt-get remove -y "$pkg" 2>/dev/null || true
  done
  ```
- **Untuk Fedora / RHEL / Rocky / AlmaLinux:**
  ```bash
  sudo dnf remove -y docker docker-client docker-client-latest docker-common \
    docker-latest docker-latest-logrotate docker-logrotate docker-selinux \
    docker-engine-selinux docker-engine 2>/dev/null || true
  ```

---

## Pilihan A: Install Docker di Ubuntu & Debian

Langkah antara Ubuntu dan Debian hampir sama persis—perbedaannya hanya di nama URL repositori (`ubuntu` vs `debian`). Pilih blok sesuai OS-mu.

### 1. Untuk Ubuntu (22.04, 24.04, dst.)

Tambahkan kunci GPG resmi Docker dan daftarkan repositori `apt`:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 2. Untuk Debian (12 Bookworm, 13 Trixie, dst.)

Tambahkan kunci GPG resmi Docker dan daftarkan repositori `apt` versi Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 3. Pasang Paket Docker Engine & Compose Plugin (Ubuntu & Debian)

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Penjelasan singkat tiap paket:
- `docker-ce`: Daemon utama Docker Engine yang menjalankan container.
- `docker-ce-cli`: Perintah `docker` di terminal.
- `containerd.io`: Runtime container tingkat rendah.
- `docker-buildx-plugin` & `docker-compose-plugin`: Mesin build modern (`BuildKit`) dan perintah `docker compose` bawaan (v2, tanpa tanda strip `-`).

---

## Pilihan B: Install Docker di Fedora, RHEL, Rocky Linux, & AlmaLinux

### 1. Untuk Fedora

Pada Fedora modern (Fedora 41 ke atas dengan DNF5), tambahkan repositori resmi Docker dengan:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile https://download.docker.com/linux/fedora/docker-ce.repo
```

*(Jika kamu memakai Fedora 40 atau lebih lama dan perintah di atas error, gunakan: `sudo dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo`.)*

### 2. Untuk RHEL, Rocky Linux, & AlmaLinux

Untuk keluarga Enterprise Linux (RHEL, Rocky Linux, AlmaLinux), Docker mengarahkan ke repositori resmi `rhel`:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

### 3. Pasang Paket & Nyalakan Layanan Docker

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

Perintah `systemctl enable --now docker` memastikan Docker langsung menyala sekarang sekaligus otomatis jalan tiap kali VPS reboot. *(Pada Ubuntu/Debian, service `docker` umumnya sudah aktif dan di-enable otomatis setelah instalasi paket.)*

---

## Langkah Wajib Pasca-Instalasi: Menjalankan Docker Tanpa `sudo`

Secara bawaan, hanya `root` yang boleh menyambung ke socket Docker. Kalau tidak ingin selalu mengetik `sudo docker ...` setiap saat di laptop atau saat deploy dengan user khusus, masukkan user Linux-mu ke dalam grup `docker`:

```bash
sudo usermod -aG docker "$USER"
```

Agar perubahan grup langsung terbaca di terminal saat ini, jalankan:

```bash
newgrp docker
```

*(Atau cukup **logout lalu login kembali** lewat SSH agar seluruh sesi terminal baru mengenali grup `docker`.)*

> **Catatan keamanan yang wajib kamu tahu:**  
> Di mata sistem Linux, **siapa pun yang tergabung di grup `docker` setara dengan hak akses `root`**, karena container bisa di-mount ke direktori root host (`-v /:/host`). Jangan pernah memasukkan sembarang user tak tepercaya ke grup `docker` di server multi-user! Untuk kebutuhan pemula di laptop atau user tunggal `deploy` di VPS milikmu sendiri, ini masih praktik standar yang wajar—selama akun tersebut dijaga ketat (SSH key + tanpa login password).

---

## Verifikasi Instalasi

Jalankan tiga perintah ini **tanpa `sudo`** untuk memastikan semua beres:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Jika muncul pesan **`Hello from Docker!`** beserta nomor versi Docker Engine dan `Docker Compose version v2.x.x` (atau lebih baru), berarti Docker di Linux sudah siap tempur!

> **Bonus pengingat keamanan untuk VPS:**  
> Jika nanti di VPS kamu memakai firewall **UFW** dan menjalankan container dengan port publik (`-p 8080:80`), ingat bahwa Docker secara bawaan bisa menembus UFW. Pelajari cara mengikat port container ke `127.0.0.1` di [panduan Docker & firewall UFW](/posts/tailscale-hardening-firewall-port/).

Selanjutnya di **Bagian 3**, kita akan memasang Docker di laptop **Windows (WSL 2)** dan **macOS** agar kamu bisa koding dengan nyaman sebelum mendorongnya ke GitHub dan VPS.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. **Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)** *(sedang dibaca)*
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [Docker Docs: Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Docs: Install Docker Engine on Debian](https://docs.docker.com/engine/install/debian/)
- [Docker Docs: Install Docker Engine on Fedora](https://docs.docker.com/engine/install/fedora/)
- [Docker Docs: Install Docker Engine on RHEL](https://docs.docker.com/engine/install/rhel/)
- [Docker Docs: Linux post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/)
