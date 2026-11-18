---
title: "Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)"
date: 2026-11-18T11:02:00+07:00
categories:
  - Git
  - Security
tags:
  - git
  - github
  - ssh
  - troubleshooting
  - pemula
description: "Cara mengatasi tiga error autentikasi dan identitas Git paling sering pada pemula: Support for password authentication was removed, git@github.com Permission denied (publickey), dan Author identity unknown."
---

Saat baru menyiapkan Git di laptop baru—atau setelah berpindah dari satu akun GitHub ke akun lain—ada tiga pesan error pembuka yang paling sering menghentikan langkah pemula bahkan sebelum kode sempat terkirim ke server.

Mari selesaikan ketiganya satu per satu dengan rapi.

---

## Error 1: `Author identity unknown (Please tell me who you are)`

Saat mengetik `git commit -m "..."` untuk pertama kali di komputer baru, Git menolak:

```text
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```

### Cara Mengatasi

Git butuh nama dan email untuk ditempel ke setiap commit sebagai catatan pembuatnya. Jalankan dua baris ini (ganti dengan nama dan email akun GitHub-mu agar grafik kontribusi GitHub tercatat rapi):

```bash
git config --global user.name "Nama Kamu"
git config --global user.email "emailkamu@contoh.com"
```

*(Jika kamu memakai laptop yang sama untuk repo kantor dan repo pribadi dengan dua akun berbeda, jangan bingung gonta-ganti—pakai cara otomatis di [identitas Git berbeda dengan `includeIf`](/posts/git-identitas-kantor-pribadi/).)*

---

## Error 2: `Support for password authentication was removed` (HTTPS)

Kamu melakukan `git clone https://github.com/user/repo.git`, lalu saat `git push`, Git meminta `Username` dan `Password`. Begitu kamu masukkan password akun login GitHub-mu, langsung muncul:

```text
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed for 'https://github.com/user/repo.git/'
```

Kenapa? Demi keamanan, GitHub **sudah melarang** login Git memakai password akun web biasa. Kamu punya **dua pilihan solusi**:

### Solusi A (Paling Praktis untuk HTTPS): Pakai GitHub CLI (`gh auth login`)

Jika ingin tetap memakai alamat remote `https://...` tanpa repot menyalin token panjang manual, pasang **GitHub CLI** (`gh`), lalu jalankan sekali:

```bash
gh auth login
```

Pilih `GitHub.com` -> `HTTPS` -> `Login with a web browser`, dan `gh` otomatis mengurus kredensial Git di laptopmu dengan aman! *(Alternatif lainnya, buat Personal Access Token di Settings -> Developer settings GitHub dan tempel token `ghp_...` tersebut di kolom Password saat Git memintanya.)*

### Solusi B (Paling Direkomendasikan untuk Jangka Panjang): Pindah ke SSH!

Dengan SSH key, kamu tidak perlu mengetik token atau login ulang berkali-kali. Cara mengubah repository yang telanjur di-clone via HTTPS ke SSH sangat cepat—cukup ganti URL remote-nya:

```bash
# Cek URL remote saat ini
git remote -v

# Ubah dari https://... ke git@github.com:...
git remote set-url origin git@github.com:USERNAME/NAMA_REPO.git
```

---

## Error 3: `git@github.com: Permission denied (publickey)`

Saat sudah memakai alamat SSH (`git@github.com:...`), tiba-tiba muncul error:

```text
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

Artinya laptopmu gagal membuktikan kepemilikan kunci privat SSH ke GitHub. Ikuti 3 langkah cek berurutan ini:

### 1. Cek apakah kunci SSH sudah ada & terbaca di laptop

```bash
ls -la ~/.ssh
```

Jika belum ada file `id_ed25519` & `id_ed25519.pub`, buat pasangan kunci modern baru:

```bash
ssh-keygen -t ed25519 -C "emailkamu@contoh.com"
```

*(Tekan Enter untuk lokasi default `~/.ssh/id_ed25519`, lalu beri passphrase jika diinginkan.)*

### 2. Pastikan kunci privatmu sudah dimuat ke `ssh-agent`

Kadang kunci sudah dibuat tetapi belum dimuat ke memori agen SSH:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

*(Pengguna macOS bisa menambahkan `--apple-use-keychain` atau `AddKeysToAgent yes` & `UseKeychain yes` di `~/.ssh/config` agar tidak perlu mengetik ulang passphrase setelah reboot.)*

### 3. Pastikan kunci publik (`.pub`) sudah ditempel di GitHub & uji koneksi

Salin isi file publiknya (**ingat: file yang berakhiran `.pub`**, BUKAN file privatnya!):

```bash
cat ~/.ssh/id_ed25519.pub
```

Tempelkan di **GitHub -> Settings -> SSH and GPG keys -> New SSH key**, lalu uji koneksi dari terminal:

```bash
ssh -T git@github.com
```

Jika keluar pesan **`Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.`**, berarti autentikasi SSH GitHub sudah 100% sukses!

---

## Checklist Singkat Sebelum Lanjut

- [x] `user.name` dan `user.email` sudah disetel di konfigurasi Git global.
- [x] Tidak lagi mengetik password web GitHub untuk URL HTTPS; memakai `gh auth login`, PAT, atau beralih ke SSH `git@github.com:...`.
- [x] `ssh -T git@github.com` sudah membalas pesan autentikasi berhasil.

Di **Bagian 4**, kita akan menyelesaikan dua error paling sering terjadi saat menarik kode dari GitHub: **`Need to specify how to reconcile divergent branches`** dan **`Your local changes to the following files would be overwritten by merge`**.

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. [Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)](/posts/git-troubleshoot-push-rejected-non-fast-forward/)
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. **Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)** *(sedang dibaca)*
4. [Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa](/posts/git-troubleshoot-divergent-branches-pull/)
5. [Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur](/posts/git-troubleshoot-salah-branch-salah-commit/)
6. [Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor](/posts/git-troubleshoot-file-besar-rahasia-github/)
7. [Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership](/posts/git-troubleshoot-line-ending-case-filename/)

---

## Referensi

- [GitHub Docs: Connecting to GitHub with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Git Official Docs: `git-config`](https://git-scm.com/docs/git-config)
