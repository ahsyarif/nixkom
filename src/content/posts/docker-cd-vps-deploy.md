---
title: Continuous Deployment (CD) ke VPS dengan Aman + Rollback
date: 2026-11-14T11:06:00+07:00
categories:
  - Infrastructure
  - Linux
  - Git
tags:
  - docker
  - github-actions
  - cd
  - vps
  - ssh
  - rollback
  - pemula
description: Menyambungkan pipeline GitHub Actions ke VPS Linux untuk deploy otomatis Docker Compose dari GHCR secara aman, termasuk opsi jalur privat Tailscale dan cara rollback 1 menit.
---

Di bagian penutup seri ini, kita akan melengkapi langkah terakhir: begitu **CI** selesai mem-build Docker image baru dan mengirimkannya ke **`ghcr.io`**, GitHub Actions akan otomatis masuk ke VPS Linux-mu untuk menarik image tersebut (`pull`) dan menjalankan container terbaru tanpa kamu harus SSH manual setiap kali deploy.

Mari lakukan dengan cara yang rapi dan aman—tanpa mengobral akses `root` atau membuka port sembarangan!

---

## Tahap 1: Siapkan Lingkungan VPS Produksi (Sekali Saja)

Masuk ke VPS Linux-mu yang sudah terpasang Docker Engine (dari **Bagian 2**), lalu siapkan direktori aplikasi dan kredensial produksi:

### 1. Buat user khusus deploy (atau gunakan user non-root `sudo` milikmu)

Jika ingin paling rapi, buat user `deploy` khusus yang masuk grup `docker` (ingat peringatan grup `docker` setara `root` di Bagian 2, jadi lindungi user ini hanya dengan SSH key):

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
```

### 2. Siapkan folder `/opt/aplikasiku`, `compose.prod.yaml`, dan `.env`

```bash
sudo mkdir -p /opt/aplikasiku
sudo chown -R deploy:deploy /opt/aplikasiku
```

Masuk sebagai user `deploy` (atau salin file `compose.prod.yaml` yang sudah kita siapkan di Bagian 4 ke `/opt/aplikasiku/compose.prod.yaml`), lalu buat file `.env` produksi asli langsung di VPS:

```bash
cat <<'EOF' > /opt/aplikasiku/.env
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=GANTI_DENGAN_PASSWORD_ACAK_KUAT
POSTGRES_DB=aplikasiku_prod
PORT=3000
IMAGE_TAG=latest
EOF

chmod 600 /opt/aplikasiku/.env
```

### 3. Jika Repository/Image GHCR Kamu Bersifat **Private**: Login Sekali di VPS

Jika package di GitHub milikmu **Public**, lewati langkah ini. Namun jika repository-mu **Private**, VPS butuh izin untuk mengunduh image dari `ghcr.io`:

1. Di GitHub: klik foto profil kanan atas -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)** -> **Generate new token (classic)**.
2. Beri nama misalnya `vps-pull-ghcr`, pilih masa berlaku yang sesuai, dan centang **hanya satu scope: `read:packages`**.
3. Di VPS (sebagai user `deploy`), jalankan login satu kali:
   ```bash
   echo "TOKEN_READ_PACKAGES_KAMU" | docker login ghcr.io -u USERNAME_GITHUB --password-stdin
   ```

*(Docker akan menyimpan kredensial tersebut di `/home/deploy/.docker/config.json`, jadi nanti pipeline CD tinggal memanggil `docker compose pull`.)*

---

## Tahap 2: Buat SSH Key Khusus Deploy & Simpan ke GitHub Secrets

Jangan pernah menaruh SSH key pribadi laptopmu ke GitHub Actions! Buat satu pasang kunci Ed25519 **khusus untuk deployment**:

Di laptopmu (atau terminal aman sementara), jalankan:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -N "" -f ./deploy_key
```

1. **Tambahkan kunci publik (`deploy_key.pub`) ke VPS** (di dalam `/home/deploy/.ssh/authorized_keys`):
   ```bash
   # Di VPS sebagai root/sudo:
   sudo mkdir -p /home/deploy/.ssh
   sudo chmod 700 /home/deploy/.ssh
   # Tempel isi deploy_key.pub ke /home/deploy/.ssh/authorized_keys
   sudo chown -R deploy:deploy /home/deploy/.ssh
   sudo chmod 600 /home/deploy/.ssh/authorized_keys
   ```
2. **Masukkan kunci privat (`deploy_key`) ke GitHub Secrets** (`Settings -> Secrets and variables -> Actions`):
   - `VPS_HOST`: IP publik VPS (atau IP Tailscale `100.x.y.z` jika memilih opsi Tailscale di bawah).
   - `VPS_USER`: `deploy`
   - `VPS_SSH_KEY`: Seluruh isi file `deploy_key` (mulai dari `-----BEGIN OPENSSH PRIVATE KEY-----` sampai `-----END OPENSSH PRIVATE KEY-----`).
3. Setelah tersimpan di GitHub Secrets, **hapus file `deploy_key` sementara** dari laptopmu (`rm -f ./deploy_key ./deploy_key.pub`).

> **Opsi Bonus (Jika Port SSH 22 Publik VPS Sudah Ditutup Pakai Tailscale!):**  
> Jika kamu mengikuti seri [mengamankan server Linux dengan Tailscale](/posts/tailscale-hardening-firewall-port/) dan menutup port 22 dari internet publik, kamu tidak perlu membuka SSH ke publik lagi! Cukup buat *OAuth client* di Tailscale (dengan izin `auth_keys` dan `tag:ci`), simpan `TS_OAUTH_CLIENT_ID` dan `TS_OAUTH_SECRET` ke GitHub Secrets, lalu tambahkan step `tailscale/github-action@v4` sebelum step SSH pada pipeline CD di bawah (dengan `VPS_HOST` diisi IP Tailscale VPS dan `grants` Tailscale mengizinkan `tag:ci` ke port `22`).

---

## Tahap 3: Tambahkan Job `deploy` ke `.github/workflows/ci-cd.yml`

Sekarang buka lagi `.github/workflows/ci-cd.yml` dari Bagian 6 dan tambahkan job **`deploy`** di bagian paling bawah (sejajar dengan `test` dan `build-and-push`):

```yaml
  deploy:
    name: Deploy Otomatis ke VPS
    needs: build-and-push
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      # OPSIONAL: aktifkan blok ini hanya jika VPS memakai Tailscale untuk menutup port 22 publik
      # - name: Masuk sementara ke jaringan privat Tailscale
      #   uses: tailscale/github-action@v4
      #   with:
      #     oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
      #     oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
      #     tags: tag:ci

      - name: Tarik image terbaru & restart container di VPS
        uses: appleboy/ssh-action@v1
        env:
          GITHUB_SHA: ${{ github.sha }}
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: 22
          envs: GITHUB_SHA
          script: |
            set -e
            cd /opt/aplikasiku

            NEW_TAG="sha-$(printf '%s' "$GITHUB_SHA" | cut -c1-7)"
            echo "Deploying image tag: $NEW_TAG"

            # Perbarui nilai IMAGE_TAG di file .env agar konsisten saat server restart nanti
            if grep -q '^IMAGE_TAG=' .env; then
              sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_TAG/" .env
            else
              echo "IMAGE_TAG=$NEW_TAG" >> .env
            fi

            docker compose -f compose.prod.yaml pull app
            docker compose -f compose.prod.yaml up -d --remove-orphans

            # Bersihkan image lama tak terpakai agar disk VPS tidak penuh
            docker image prune -f
```

Lihat betapa rapinya alur skrip di atas:

- Skrip memakai **`NEW_TAG="sha-..."`** yang persis sama dengan tag 7-karakter hasil `docker/metadata-action` di Bagian 6—jadi VPS dijamin selalu menarik versi commit yang baru saja lolos tes!
- `set -e` membuat skrip langsung berhenti kalau ada perintah yang gagal (misalnya gagal download image), sehingga container lama yang masih sehat tidak ikut dimatikan!
- `docker compose -f compose.prod.yaml up -d --remove-orphans` hanya mengganti container `app` yang image-nya berubah; container `db` (PostgreSQL) tetap menyala tenang tanpa perlu di-restart!

---

## Tahap 4: Layani Publik Lewat Reverse Proxy HTTPS (Caddy / Nginx)

Ingat di Bagian 4, kita mengikat port aplikasi ke **`127.0.0.1:3000:3000`** agar tidak bocor lewat Docker-UFW bypass. Supaya pengunjung bisa membuka `https://domainkamu.com`, pasang reverse proxy ringan di VPS—contoh paling praktis untuk pemula adalah **Caddy** karena mengurus sertifikat SSL Let's Encrypt otomatis hanya dalam 3 baris di `/etc/caddy/Caddyfile`:

```text
aplikasiku.contoh.com {
    reverse_proxy 127.0.0.1:3000
}
```

Jika aplikasimu memang khusus untuk internal kantor/pribadi, cukup jalankan `sudo tailscale serve --bg http://127.0.0.1:3000` (seperti dibahas di [artikel Tailscale Serve untuk layanan internal](/posts/tailscale-hardening-layanan-internal/)).

---

## Cara Rollback dalam 1 Menit Jika Rilis Baru Bermasalah

Suatu hari pasti ada kejadian: tes otomatis lolos, deploy hijau, eh ternyata ada bug tampilan atau logika bisnis yang baru ketahuan setelah live!

Karena di Bagian 6 setiap commit kita tag dengan `sha-xxxxxxx`, kamu punya dua cara **rollback** yang sama-sama cepat:

1. **Rollback Instan di VPS (Darurat < 1 Menit):**  
   SSH ke VPS, cek 1 tag commit stabil sebelumnya di tab **Packages** GitHub (misalnya `sha-4f91a2b`), lalu jalankan:
   ```bash
   cd /opt/aplikasiku
   sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-4f91a2b/' .env
   docker compose -f compose.prod.yaml pull app
   docker compose -f compose.prod.yaml up -d
   ```
   Dalam beberapa detik, server kembali menjalankan container lama yang sehat!
2. **Rollback Permanen di GitHub:**  
   Klik tombol **Revert** pada Pull Request bermasalah di GitHub (atau `git revert <hash>` di lokal lalu PR ke `main`). Pipeline CI/CD akan kembali menguji kode hasil revert dan men-deploy ulang versi bersih ke VPS sehingga kode di Git dan VPS kembali sinkron!

---

## Ringkasan Alur Lengkap yang Kini Kamu Miliki

Selamat! Dari laptop Windows WSL 2, macOS, maupun Linux, kamu kini punya alur kerja standar industri:

- [x] **Lokal konsisten:** `docker compose up` berjalan di Docker Engine / Docker Desktop + WSL 2 dengan perilaku sama seperti produksi.
- [x] **Git disiplin:** Branch fitur -> `git status` aman (`.env` terlindungi `.gitignore`) -> Pull Request ke `main`.
- [x] **CI teruji:** GitHub Actions otomatis menjalankan tes, mengecek `Dockerfile`, dan mengirim image berlabel `sha-...` ke `ghcr.io`.
- [x] **CD terotomatisasi:** VPS menarik image matang tanpa kehabisan RAM karena kompilasi, mengikat port ke `127.0.0.1`, dan siap *rollback* kapan saja dalam hitungan detik.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. [Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose](/posts/docker-dev-lokal-compose/)
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. **Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback** *(sedang dibaca)*

---

## Referensi

- [Docker Docs: Introduction to GitHub Actions with Docker](https://docs.docker.com/build/ci/github-actions/)
- [GitHub Marketplace: `appleboy/ssh-action`](https://github.com/appleboy/ssh-action)
- [Tailscale Docs: GitHub Action (`tailscale/github-action`)](https://tailscale.com/docs/integrations/github/github-action)
- [GitHub Docs: Working with the Container registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
