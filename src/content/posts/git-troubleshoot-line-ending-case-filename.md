---
title: "Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership"
date: 2026-11-18T11:06:00+07:00
categories:
  - Git
tags:
  - git
  - windows
  - linux
  - macos
  - troubleshooting
  - pemula
description: "Cara mengatasi kendala Git lintas sistem operasi: git diff kotor akibat CRLF vs LF dan filemode chmod, rename huruf kapital yang diabaikan Windows/macOS hingga mematahkan build Linux, dan fatal: detected dubious ownership."
---

Ketika bekerja di tim yang memakai OS berbeda—atau kamu koding di Windows/macOS lalu men-deploy ke VPS Linux—ada tiga kendala Git "aneh" yang sering membuat pemula bingung setengah mati.

Mari bereskan ketiganya sekali untuk selamanya!

---

## Masalah 1: `git status` Penuh File Berubah Padahal Belum Edit Apa-Apa (`CRLF` vs `LF` & `filemode`)

Kamu baru saja `git clone` (atau membuka folder proyek di Windows WSL), belum mengetik satu huruf pun, tetapi `git status` menampilkan puluhan file berubah (*modified*). Saat dijalankan `git diff`, setiap barisnya tampak identik!

Biasanya pelakunya ada dua:

### A. Perbedaan Penanda Akhir Baris (`CRLF` di Windows vs `LF` di Linux/macOS)

Windows memakai `\r\n` (`CRLF`) untuk akhir baris teks, sedangkan Linux dan macOS memakai `\n` (`LF`). Selain bikin `git diff` kotor, skrip shell Linux (`.sh`) yang tersimpan dengan `CRLF` **akan gagal dijalankan di VPS Linux** dengan error membingungkan seperti `/bin/bash^M: bad interpreter`!

**Solusi terbaik & standar tim (`.gitattributes`):**  
Buat satu file bernama **`.gitattributes`** di root repository agar semua komputer (Windows, Mac, Linux) memakai aturan yang sama secara konsisten:

```text
# Otomatis normalkan teks ke LF di repository
* text=auto eol=lf

# Pastikan file biner tidak pernah disentuh
*.png binary
*.jpg binary
*.pdf binary
```

Untuk proyek di laptop Windows pribadi, setelan bawaan yang umum adalah `git config --global core.autocrlf true` (atau `input` di macOS/Linux/WSL), dan adanya `.gitattributes` langsung mengunci konsistensi bagi seluruh anggota tim!

### B. Perubahan Izin File (`chmod` / `filemode`)

Jika kamu pernah mengubah permission folder (`chmod`) atau mengakses repo yang sama dari Windows dan WSL, Git kadang mengira seluruh file berubah hanya karena status bit *executable* (`100644` -> `100755`).

Jika memang perubahan permission tersebut tidak perlu dilacak di lingkungan lokalmu, matikan pelacakan `filemode` pada repository itu:

```bash
git config core.filemode false
```

---

## Masalah 2: Ganti Huruf Besar/Kecil Nama File di Windows/Mac -> Build di VPS Linux Error!

Ini jebakan klasik paling menyebalkan antara **Windows/macOS** (*case-insensitive* secara bawaan) dan **Linux** (*case-sensitive*):

1. Kamu mengganti nama file dari `Header.tsx` menjadi `header.tsx` di Finder/Explorer.
2. Di laptop Windows/Mac, `git status` diam saja seolah tidak ada perubahan!
3. Kode di laptopmu jalan lancar, tetapi begitu di-push dan di-build di **GitHub Actions atau VPS Linux**, langsung error: `Module not found: './header'` karena di Git dan Linux namanya masih `Header.tsx`!

### Cara Mengatasi yang Benar: Gunakan `git mv`

Jangan me-rename huruf besar/kecil hanya lewat File Explorer/Finder—suruh Git langsung yang memindahkannya dengan **`git mv`**:

```bash
git mv Header.tsx header.tsx
```

*(Jika filesystem di laptopmu masih menolak karena menganggap kedua nama sama, lakukan 2 langkah aman via nama sementara:*
`git mv Header.tsx header-temp.tsx && git mv header-temp.tsx header.tsx` *lalu `git commit`!)*

---

## Masalah 3: `fatal: detected dubious ownership in repository`

Error ini sering muncul di versi Git modern ketika kamu mengakses folder Git dari container **Docker**, lewat **WSL2**, atau sebagai `root` (`sudo git status`) terhadap folder milik user biasa:

```text
fatal: detected dubious ownership in repository at '/opt/aplikasiku'
To add an exception for this directory, call:

        git config --global --add safe.directory /opt/aplikasiku
```

Kenapa Git memblokirnya? Ini fitur keamanan untuk mencegah seseorang menjebakmu menjalankan perintah Git di dalam folder milik user lain yang mungkin berisi skrip berbahaya tersembunyi di `.git/hooks` atau `.git/config`.

### Cara Memperbaiki yang Paling Sehat

1. **Di VPS Linux (jika kepemilikan folder yang salah):**  
   Jangan asal mengabaikan peringatan—perbaiki dulu kepemilikan foldernya agar cocok dengan user yang bekerja di sana!
   ```bash
   sudo chown -R "$USER":"$USER" /opt/aplikasiku
   ```
2. **Jika memang disengaja (misalnya di dalam container CI/CD atau akses lintas Windows-WSL yang aman):**  
   Barulah daftarkan folder yang kamu percayai itu ke `safe.directory`:
   ```bash
   git config --global --add safe.directory /opt/aplikasiku
   ```
   *(Hindari memakai wildcard `*` secara global kalau komputer/server tersebut dipakai bersama orang lain.)*

---

## Penutup Seri: Ringkasan Pertolongan Pertama Saat Git Bermasalah

Simpan peta cepat 7 situasi paling sering muncul ini:

1. **`git push` ditolak (`fetch first` / `no upstream`)?** -> `git pull --rebase` baru `git push`, atau `git push -u origin nama-branch`.
2. **Masuk `detached HEAD`?** -> `git switch main` (kalau cuma lihat), atau `git switch -c branch-baru` (kalau sudah commit!).
3. **Autentikasi GitHub ditolak (`password removed` / `publickey`)?** -> Set `user.name`/`user.email`, pakai SSH key `ed25519` + `ssh -T git@github.com` atau `gh auth login`.
4. **`git pull` gagal (`divergent branches` / perubahan lokal tertimpa)?** -> `git stash -u` -> `git pull --rebase` -> `git stash pop` (atau `git rebase --abort` jika ingin mundur).
5. **Terlanjur commit di `main`?** -> Belum push: `git branch feat/baru && git reset --hard HEAD~1 && git switch feat/baru`. Sudah push: `git revert HEAD`.
6. **File > 100 MB atau `.env` masuk commit?** -> Belum push (commit terakhir): `git reset --soft HEAD~1` + `git restore --staged`. Rahasia telanjur push ke GitHub: **segera revoke/ganti kunci terlebih dahulu!**
7. **Masalah lintas OS?** -> Gunakan `.gitattributes` (`eol=lf`), `git mv` untuk ubah huruf kapital nama file, dan perbaiki kepemilikan folder sebelum `safe.directory`.

Selamat ngoding lebih tenang tanpa takut merusak riwayat Git!

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. [Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)](/posts/git-troubleshoot-push-rejected-non-fast-forward/)
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. [Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)](/posts/git-troubleshoot-auth-ssh-https-github/)
4. [Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa](/posts/git-troubleshoot-divergent-branches-pull/)
5. [Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur](/posts/git-troubleshoot-salah-branch-salah-commit/)
6. [Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor](/posts/git-troubleshoot-file-besar-rahasia-github/)
7. **Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership** *(sedang dibaca)*

---

## Referensi

- [Git Official Docs: `gitattributes`](https://git-scm.com/docs/gitattributes)
- [Git Official Docs: `git-mv`](https://git-scm.com/docs/git-mv)
- [Git Official Docs: `git-config`](https://git-scm.com/docs/git-config)
