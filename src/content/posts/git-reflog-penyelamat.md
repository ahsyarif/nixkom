---
title: "Penyelamat terakhir waktu salah reset atau hapus branch: git reflog"
date: 2026-11-11T17:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Selama sudah pernah di-commit, kode yang hilang gara-gara git reset --hard atau git branch -D masih bisa ditarik balik lewat git reflog."
---

Pernah nggak sengaja menjalankan `git reset --hard HEAD~3` atau menghapus *branch* pakai `git branch -D`, terus lemas karena kerjaan seharian hilang dari `git log`? Tenang dulu. Selama perubahan itu **sudah pernah di-*commit*** di laptopmu, Git sebenarnya tidak langsung menghapus datanya dari diska. Ada buku catatan lokal bernama `reflog` (*reference logs*) yang merekam setiap perpindahan posisi `HEAD` secara diam-diam.

## Cara mencari commit yang hilang

Ketik perintah ini di terminal:

```bash
git reflog
```

Git bakal menampilkan daftar gerakan terakhir yang kamu lakukan di repo lokal, lengkap dengan kode *hash* di kolom paling kiri:

```text
c8204ab (HEAD -> main) HEAD@{0}: reset: moving to HEAD~3
a4f81c2 HEAD@{1}: commit: feat: tambah validasi kupon diskon
79b3e10 HEAD@{2}: commit: refactor: rapikan hitung pajak
31d09fa HEAD@{3}: checkout: moving from main to feat/diskon
```

Lihat baris `HEAD@{0}`: itu catatan waktu kamu salah menjalankan `reset`. Satu baris tepat di bawahnya (`HEAD@{1}` dengan *hash* `a4f81c2`) adalah posisi terakhir sebelum bencana terjadi.

## 1. Mengembalikan commit yang terhapus karena `reset --hard`

Begitu kamu menemukan *hash* sebelum kejadian (`a4f81c2`), kembalikan posisi *branch*-mu ke titik tersebut:

```bash
git reset --hard a4f81c2
```

Cek lagi pakai `git log --oneline`, semua *commit* yang tadi sempat lenyap langsung kembali utuh seperti semula.

## 2. Menghidupkan lagi branch yang tidak sengaja dihapus

Misalnya kamu salah menghapus *branch* `feat/diskon` dengan `git branch -D feat/diskon` padahal isinya belum sempat digabung ke `main`. Cari saja di `git reflog` baris terakhir saat kamu berada di *branch* itu (atau *commit* terakhir yang dibuat di sana, misalnya `a4f81c2`), lalu buat ulang *branch*-nya di titik *hash* tersebut:

```bash
git switch -c feat/diskon a4f81c2
```

*Branch* `feat/diskon` langsung hidup lagi lengkap dengan seluruh riwayat *commit*-nya.

## Dua batasan yang wajib diingat

1. **`git reflog` cuma menyelamatkan yang sudah pernah di-*commit*.** Kalau kamu menulis kode baru seharian tanpa pernah menjalankan `git commit` sekali pun, lalu kamu hajar dengan `git reset --hard` atau `git restore`, perubahan itu benar-benar hilang dan tidak tercatat di `reflog`.
2. **Catatan `reflog` hanya ada di laptopmu dan punya masa kedaluwarsa.** Secara bawaan, Git menyimpan catatan *commit* yang tidak lagi terhubung ke *branch* mana pun (*unreachable commits*) selama 30 hari sebelum akhirnya dibersihkan otomatis oleh *garbage collector* (`git gc`). Jadi kalau sadar ada yang salah hapus, langsung pulihkan hari itu juga.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. **Penyelamat terakhir waktu salah reset atau hapus branch: git reflog**
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
