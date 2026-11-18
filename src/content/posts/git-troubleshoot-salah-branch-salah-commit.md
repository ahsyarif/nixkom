---
title: "Salah Commit di Branch Main atau Lupa Buat Branch Fitur"
date: 2026-11-18T11:04:00+07:00
categories:
  - Git
tags:
  - git
  - branch
  - reset
  - revert
  - troubleshooting
  - pemula
description: "Cara memindahkan perubahan dan commit yang terlanjur dibuat di branch main ke branch fitur baru dengan aman, baik sebelum maupun sesudah di-push ke GitHub."
---

Kejadian ini dialami oleh semua programmer, dari pemula sampai senior: kamu sudah serius menulis kode selama 2 jam—bahkan sudah menjalankan `git commit` satu atau dua kali—lalu baru sadar melihat prompt terminal: ternyata sejak tadi kamu **masih berdiri di branch `main`**, bukan di branch fitur!

Kabar baiknya: kamu sama sekali **tidak perlu** menyalin kode manual ke folder lain lalu mengulang dari nol. Cara memindahkannya cuma butuh 1–3 perintah tergantung sudah sampai mana langkahmu tadi.

---

## Kondisi 1: Sudah Koding Panjang, Tapi Belum `git commit`

Ini situasi paling mudah! Jika perubahanmu masih berada di *working directory* atau baru masuk `git add` (*staging*) dan belum di-`commit`, cukup buat dan pindah ke branch baru sekarang juga:

```bash
git switch -c feat/halaman-profil
```

Seluruh editan dan file barumu otomatis ikut terbawa ke branch `feat/halaman-profil`, sedangkan branch `main` tetap utuh bersih seperti semula!

*(Jika Git menolak pindah karena ada file konflik tertentu, gunakan `git stash -u` -> `git switch -c feat/halaman-profil` -> `git stash pop`.)*

---

## Kondisi 2: Sudah Telanjur `git commit` di `main`, Tapi **Belum `git push`**

Anggap kamu sudah terlanjur membuat **1 commit** di `main` (dan belum sempat di-push ke GitHub). Tujuannya sekarang dua:
1. Menaruh commit baru tadi ke dalam branch fitur (`feat/halaman-profil`).
2. Memundurkan kembali branch `main` ke posisi sebelum kamu membuat commit tersebut.

Ikuti 3 langkah berurutan ini (jangan terbalik!):

```bash
# 1. Buat branch fitur tepat di posisi sekarang (mengandung commit barumu), TANPA pindah dulu
git branch feat/halaman-profil

# 2. Mundurkan branch main 1 commit ke belakang (jika terlanjur 2 commit, ganti ~1 menjadi ~2)
git reset --hard HEAD~1

# 3. Pindah ke branch fitur yang sudah mengamankan commit tadi
git switch feat/halaman-profil
```

> **Cek dulu sebelum `reset --hard`:**  
> Jalankan `git log --oneline -n 5` terlebih dahulu untuk memastikan berapa jumlah commit salah tempat (`HEAD~1`, `HEAD~2`, dst.), **dan pastikan tidak ada perubahan belum ter-commit di `git status`** sebelum menjalankan `--hard`! *(Kalau masih ada perubahan belum ter-commit, `git stash -u` dulu!)*

Setelah Langkah 3, cek `git log --oneline -n 3`: commit-mu sudah aman di `feat/halaman-profil`, sementara `main` kembali identik dengan `origin/main`!

---

## Kondisi 3: Salah Commit di `main` dan **Sudah Terlanjur `git push` ke GitHub!**

Jika commit tersebut sudah terlanjur naik ke branch `main` yang dipakai bersama tim (atau bahkan sudah memicu CI/CD yang error!), **JANGAN** memakai `git reset` lalu `git push --force`, karena bisa mengacaukan salinan `main` milik rekan tim lain!

Sebagai gantinya, gunakan **`git revert`**:

```bash
# 1. Selamatkan dulu commit tadi ke branch fitur sebelum dibalikkan di main
git branch feat/halaman-profil

# 2. Buat commit baru di main yang secara rapi MEMBALIKKAN perubahan commit terakhir
git revert HEAD

# 3. Push pemulihan aman ke GitHub
git push origin main
```

Mengapa `git revert` paling aman untuk branch publik? Karena ia tidak menghapus atau menulis ulang masa lalu—ia mencatat commit baru *"Revert '...'"* yang menghapus efek commit salah tersebut secara transparan.

*(Untuk skenario pembatalan lain seperti lupa file di commit terakhir atau mengedit pesan commit typo sebelum push, baca juga [merapikan commit terakhir dengan `git commit --amend`](/posts/git-commit-amend/) dan [cara membatalkan perubahan Git](/posts/git-membatalkan-perubahan/).)*

---

## Trik Pencegahan: Tampilkan Nama Branch Selalu di Prompt Terminal

Penyebab utama salah commit di `main` adalah prompt terminal polos yang tidak menampilkan nama branch saat ini. Biasakan dua kebiasaan kecil ini:

1. Cek `git status` atau `git branch` sebelum mengetik kode apa pun.
2. Di GitHub repository penting, aktifkan **Branch Protection Rule** pada `main` (*Require a pull request before merging*) sehingga GitHub otomatis menolak jika suatu hari kamu tidak sengaja mengetik `git push origin main` langsung!

---

## Checklist Singkat Sebelum Lanjut

- [x] Jika belum `commit`, langsung jalankan `git switch -c nama-branch-fitur`.
- [x] Jika sudah `commit` di `main` tapi belum `push`, buat branch dulu (`git branch ...`) baru `git reset --hard HEAD~1`.
- [x] Jika sudah terlanjur `push` ke branch bersama, gunakan `git revert HEAD` (bukan `reset --hard` + force push).

Di **Bagian 6**, kita akan menghadapi dua error yang paling sering membuat panik saat mendorong ke GitHub: **`File exceeds GitHub's file size limit of 100.00 MB`** dan **`Push Protection` karena file `.env` / API Key / `node_modules` ikut ter-commit**!

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. [Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)](/posts/git-troubleshoot-push-rejected-non-fast-forward/)
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. [Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)](/posts/git-troubleshoot-auth-ssh-https-github/)
4. [Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa](/posts/git-troubleshoot-divergent-branches-pull/)
5. **Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur** *(sedang dibaca)*
6. [Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor](/posts/git-troubleshoot-file-besar-rahasia-github/)
7. [Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership](/posts/git-troubleshoot-line-ending-case-filename/)

---

## Referensi

- [Git Official Docs: `git-switch`](https://git-scm.com/docs/git-switch)
- [Git Official Docs: `git-reset`](https://git-scm.com/docs/git-reset)
- [Git Official Docs: `git-revert`](https://git-scm.com/docs/git-revert)
