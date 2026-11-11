---
title: "Salah commit atau salah edit? Cara membatalkan perubahan di Git"
date: 2026-11-11T13:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Panduan memilih git restore, git reset --soft, atau git revert sesuai posisi kesalahan supaya kodingan nggak hilang."
---

Waktu salah ngedit berkas atau telanjur bikin *commit* yang keliru, jangan buru-buru mengetik `git reset --hard`. Perintah itu langsung menyapu bersih semua perubahan yang belum tersimpan tanpa bisa di-*undo* lewat `Ctrl+Z`. Di Git, obat untuk membatalkan kesalahan tergantung pada posisi perubahanmu saat ini: masih di *working tree*, sudah masuk *staging area*, sudah jadi *commit* lokal, atau sudah telanjur naik ke server (*remote*).

## Pilih perintah sesuai kondisinya

| Kondisi kesalahan | Perintah yang dipakai | Nasib ketikanmu |
|---|---|---|
| Salah edit berkas, belum `git add` | `git restore <berkas>` | Editan di berkas itu dibuang, kembali ke isi *commit* terakhir. |
| Terlanjur `git add`, mau keluarkan dari *staging* | `git restore --staged <berkas>` | Keluar dari antrean *commit*, tapi isi editan di berkas tetap utuh. |
| Salah *commit* di lokal (belum `git push`) | `git reset --soft HEAD~1` | *Commit* terakhir dibongkar, semua perubahannya balik ke *staging*. |
| Salah *commit* dan sudah telanjur `git push` | `git revert <hash>` | Bikin *commit* baru yang membalik perubahan tanpa merusak riwayat teman. |

## 1. Membuang editan yang belum di-add

Kalau kamu habis ngacak-ngacak satu berkas buat eksperimen dan mau mengembalikannya ke kondisi bersih sesuai *commit* terakhir, pakai `git restore`:

```bash
git restore internal/auth/login.go
```

Hati-hati: begitu perintah ini jalan, semua editan yang belum di-*stage* di berkas tersebut langsung hilang. Kalau cuma mau membuang beberapa baris dan mempertahankan sisanya, tambahkan opsi `-p` (`git restore -p internal/auth/login.go`) supaya kamu bisa memilih per potongan.

## 2. Mengeluarkan berkas yang telanjur di-add

Sering kejadian: ketik `git add .` terlalu cepat, padahal ada berkas konfigurasi lokal yang belum siap ikut masuk *commit*. Buat menariknya kembali dari *staging area* tanpa menghapus isi editannya:

```bash
git restore --staged config.local.yaml
```

Kalau mau mengeluarkan semua berkas sekaligus dari *staging*, ganti nama berkasnya dengan titik (`git restore --staged .`).

## 3. Membongkar commit terakhir yang belum di-push

Baru selesai `git commit`, tiba-tiba sadar salah *branch* atau skrip belum dites jalan. Selama *commit* itu belum kamu `git push`, bongkar pakai `--soft`:

```bash
git reset --soft HEAD~1
```

`HEAD~1` artinya mundur satu langkah dari posisi sekarang. Karena memakai `--soft`, Git hanya memundurkan penunjuk *commit* dan membiarkan seluruh ketikanmu tetap rapi di dalam *staging area*. Kamu tinggal memperbaiki bagian yang salah, lalu `git commit` lagi.

Ada juga varian `--mixed` (setelan bawaan kalau kamu cuma mengetik `git reset HEAD~1`). Bedanya tipis: perubahanmu tetap utuh di berkas, tapi dikeluarkan dari *staging area* sehingga kamu perlu `git add` ulang.

## 4. Membatalkan commit yang sudah naik ke server

Kalau *commit* yang salah sudah telanjur masuk ke `origin/main` atau *branch* yang dipakai bareng rekan setim, jangan pakai `git reset`. Mengubah sejarah yang sudah diunduh orang lain bakal bikin repo temanmu bentrok waktu mereka `git pull`.

Pakai `git revert` supaya Git membuatkan satu *commit* baru yang isinya kebalikan persis dari *commit* yang salah tadi:

```bash
git revert a4f81c2
git push
```

Baris yang tadinya ditambah pada *commit* `a4f81c2` akan dihapus, dan baris yang tadinya dihapus akan dikembalikan. Riwayat *branch* tetap maju lurus dan aman buat seluruh tim.

## Kapan boleh pakai `git reset --hard`?

Pakai `git reset --hard HEAD` hanya kalau kamu benar-benar yakin ingin membuang seluruh perubahan di *working tree* maupun *staging area* sampai tak bersisa. Sebelum menekan `Enter`, biasakan jalankan `git status -sb` dulu untuk memastikan tidak ada kodingan penting yang ikut tersapu.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. **Salah commit atau salah edit? Cara membatalkan perubahan di Git**
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
