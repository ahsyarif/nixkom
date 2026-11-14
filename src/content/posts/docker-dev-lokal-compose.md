---
title: "Proyek lokal siap CI/CD: Dockerfile, .dockerignore, Compose"
date: 2026-11-14T11:03:00+07:00
categories:
  - DevOps
  - Linux
  - Server
tags:
  - docker
  - compose
  - dockerfile
  - vps
  - pemula
description: "Susun proyek lokal yang siap CI/CD dan VPS: Dockerfile multi-stage, .dockerignore, pemisahan .env, serta compose lokal dan produksi."
---

Setelah Docker terpasang di laptop dan VPS, kesalahan berikutnya yang sering membuat alur deploy berantakan adalah mencampur konfigurasi laptop dengan konfigurasi VPS—misalnya file `.env` rahasia ikut masuk image, atau VPS malah menjalankan mode *development* (`nodemon`) bukannya mode produksi!

Di bagian ini, kita akan menyusun struktur proyek bersih yang nyaman dijalankan di laptop **sekaligus** siap dikirim otomatis oleh GitHub Actions ke VPS.

---

## Struktur Folder Proyek yang Rapi

Sebagai contoh nyata yang mudah diikuti, anggap kita membuat aplikasi web Node.js (Express/API) yang memakai PostgreSQL (polanya berlaku persis sama untuk Python/FastAPI, Go, Laravel, atau Next.js):

```text
aplikasiku/
├── .github/
│   └── workflows/        # Pipeline CI/CD (akan dibuat di Bagian 6 & 7)
├── src/
│   └── index.js          # Kode aplikasi
├── package.json
├── package-lock.json
├── Dockerfile            # Resep build image produksi
├── .dockerignore         # Daftar file yang DILARANG masuk image Docker
├── .gitignore            # Daftar file yang DILARANG masuk Git & GitHub
├── .env.example          # Contoh nama variabel lingkungan (tanpa password!)
├── .env                  # Password lokal asli (JANGAN masuk Git!)
├── compose.yaml          # Untuk koding di laptop lokal
└── compose.prod.yaml     # Untuk berjalan di VPS produksi
```

---

## Langkah 1: Tulis `.dockerignore` dan `.gitignore` Terlebih Dahulu

Ini langkah kecil yang menyelamatkan dua hal besar: **keamanan rahasia** dan **ukuran image**.

### File `.dockerignore`

Saat `docker build` berjalan, Docker mengirim seluruh folder proyek (*build context*) ke BuildKit. Tanpa `.dockerignore`, folder `node_modules/` raksasa dari laptopmu dan file `.env` bisa ikut tersalin ke dalam container!

```text
.git
.github
node_modules
dist
.env
.env.*
*.log
```

### File `.gitignore`

Pastikan `.env` juga tidak pernah ter-commit ke GitHub (hanya `.env.example` yang boleh masuk Git):

```text
node_modules/
dist/
.env
.env.*
!.env.example
*.log
```

*(Kalau suatu saat kamu telanjur meng-commit file `.env` sebelum menambahkannya ke `.gitignore`, segera ikuti langkah bersihkannya di [cara hapus file yang telanjur masuk Git](/posts/git-rm-cached-gitignore/).)*

---

## Langkah 2: Tulis `Dockerfile` (*Multi-Stage Build* + User Non-Root)

`Dockerfile` yang bagus punya tiga ciri:
1. Memanfaatkan **cache layer** (salin `package*.json` dan install dependensi *sebelum* menyalin seluruh source code, jadi kalau cuma ubah kode di `src/`, Docker tidak perlu download ulang semua library).
2. Memakai **multi-stage build** agar library build/dev tidak menumpuk di image akhir (image jadi jauh lebih ramping dan minim celah keamanan).
3. Menjalankan aplikasi memakai **user non-root**, bukan `root`!

Contoh `Dockerfile` untuk proyek Node.js (`22-alpine`):

```dockerfile
# --- Tahap 1: Build / siapkan dependensi ---
FROM node:22-alpine AS builder
WORKDIR /app

# Salin manifest dulu supaya layer npm ci ter-cache dengan baik
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build --if-present

# --- Tahap 2: Runtime produksi ramping ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Hanya install dependensi produksi (tanpa devDependencies)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Salin hasil kode/build dari tahap builder dan beri kepemilikan user 'node'
COPY --chown=node:node --from=builder /app/src ./src

# Wajib: jalankan sebagai user non-root bawaan image node
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/index.js"]
```

Penjelasan beberapa baris penting di atas:

- `npm ci`: Lebih cepat dan deterministik daripada `npm install` karena wajib mengikuti versi tepat di `package-lock.json`.
- `USER node`: Image resmi `node:alpine` sudah menyediakan user non-root bernama `node`. Jika suatu hari ada bug di aplikasi, penyerang tidak otomatis menjadi `root` di dalam container.
- `HEALTHCHECK`: Memberi tahu Docker apakah aplikasi di dalam container benar-benar merespons sehat di `/health`, bukan sekadar proses yang macet. *(Pastikan di aplikasimu tersedia endpoint `/health` yang membalas HTTP 200 OK—dan ingat di image `alpine`, `wget` sudah tersedia secara bawaan.)*

---

## Langkah 3: Pisahkan `compose.yaml` (Lokal) vs `compose.prod.yaml` (VPS)

Menjalankan database dan aplikasi di laptop punya kebutuhan berbeda dengan di VPS:

### File 1: `compose.yaml` (Untuk Development di Laptop)

Di laptop, kamu ingin mem-build `Dockerfile` lokal langsung dan mengekspor port database supaya gampang dicek dengan DBeaver/TablePlus:

```yaml
services:
  app:
    build: .
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-appuser}
      POSTGRES_PASSWORD: ${DB_PASS:-devpassword}
      POSTGRES_DB: ${DB_NAME:-aplikasiku}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-appuser} -d ${DB_NAME:-aplikasiku}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pg_data:
```

Uji di laptop dengan:

```bash
cp .env.example .env
docker compose up --build
```

Perhatikan bagian `condition: service_healthy`: container `app` tidak akan dinyalakan sebelum PostgreSQL benar-benar siap menerima koneksi, sehingga tidak lagi error *connection refused* saat pertama kali dijalankan!

### File 2: `compose.prod.yaml` (Untuk VPS Produksi)

Di VPS nanti, kita **tidak mem-build kode di VPS**, melainkan **menarik image jadi dari GHCR** (`ghcr.io`), dan port `5432` database **sama sekali tidak perlu dibuka ke host VPS** karena `app` bisa langsung menghubungi `db:5432` lewat jaringan internal Docker!

```yaml
services:
  app:
    image: ghcr.io/USERNAME_GITHUB/NAMA_REPO:${IMAGE_TAG:-latest}
    ports:
      # Ikat hanya ke 127.0.0.1 agar nanti dilayani aman oleh reverse proxy (Caddy/Nginx)
      - "127.0.0.1:3000:3000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    env_file:
      - .env
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pg_data:
```

Lihat betapa rapinya dua detail keamanan produksi di `compose.prod.yaml`:
1. **`"127.0.0.1:3000:3000"`:** Aplikasi tidak langsung terbuka di `0.0.0.0:3000` (menghindari jebakan Docker menembus firewall UFW!). Di VPS, cukup pasang reverse proxy seperti **Caddy** atau **Nginx** di `127.0.0.1:3000` untuk mengurus HTTPS domain publikmu (atau `tailscale serve` jika aplikasinya internal!).
2. **`db` tidak punya bagian `ports:`:** PostgreSQL hanya hidup di jaringan privat antar-container Compose. Tidak ada port `5432` yang terbuka di host VPS maupun internet!

---

## Checklist Singkat Sebelum Lanjut

- [x] `.dockerignore` dan `.gitignore` sudah melindungi `.env`, `.git`, dan `node_modules`.
- [x] `Dockerfile` sudah memakai *multi-stage build* dan berjalan sebagai user non-root (`USER node`).
- [x] `compose.yaml` (lokal) sudah berhasil diuji di laptop lewat `docker compose up --build`.
- [x] `compose.prod.yaml` (VPS) sudah siap menarik image dari `ghcr.io/...:${IMAGE_TAG:-latest}`.

Di **Bagian 5**, kita akan merapikan alur kerja **Git & GitHub**—mulai dari kebiasaan branch & Pull Request, melindungi branch `main`, hingga menyiapkan *GitHub Secrets* dan izin *GHCR* sebelum membangun otomatisasi CI/CD.

---

## Seri Docker Multi-OS & Alur Development Lokal ke VPS

1. [Bagian 1 — Mengenal Docker & Gambaran Alur Development dari Laptop ke VPS](/posts/docker-cicd-arsitektur/)
2. [Bagian 2 — Cara Install Docker di Linux (Ubuntu, Debian, Fedora, RHEL/Rocky)](/posts/docker-install-linux/)
3. [Bagian 3 — Cara Install Docker di Windows (WSL 2) & macOS + Setup Lokal](/posts/docker-install-mac-windows/)
4. **Bagian 4 — Siapkan Proyek Lokal dengan Dockerfile, .dockerignore, & Docker Compose** *(sedang dibaca)*
5. [Bagian 5 — Alur Git & GitHub dari Laptop ke Repository (Branch, PR, Secrets, & GHCR)](/posts/docker-git-github-workflow/)
6. [Bagian 6 — Bangun Pipeline CI dengan GitHub Actions: Tes & Build Image ke GHCR](/posts/docker-ci-github-actions/)
7. [Bagian 7 — Continuous Deployment (CD) ke VPS dengan Aman + Rollback](/posts/docker-cd-vps-deploy/)

---

## Referensi

- [Docker Docs: Docker Compose getting started](https://docs.docker.com/compose/gettingstarted/)
- [Docker Docs: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Docs: Building best practices](https://docs.docker.com/build/building/best-practices/)
