---
title: "Salah commit atau salah edit? Cara membatalkan perubahan Git"
date: 2026-11-11T13:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Panduan memilih git restore, git reset --soft, atau git revert sesuai posisi kesalahan supaya kodingan nggak hilang."
---

Saat baru belajar Git, salah satu momen paling bikin panik adalah ketika sadar salah mengedit berkas atau salah melakukan *commit*. Banyak pemula langsung mengetik `git reset --hard`—padahal perintah itu seperti tombol penghapus tanpa "Undo": semua perubahan yang belum tersimpan langsung disapu bersih dan tidak bisa dikembalikan dengan `Ctrl+Z`.

Kunci agar tidak salah langkah adalah memahami di mana posisi perubahanmu sekarang. Dalam alur kerja Git, perubahan bergerak melewati empat tahap:
1. **Meja kerja (*working tree*):** baru kamu edit di code editor, belum di-`git add`.
2. **Keranjang siap kirim (*staging area*):** sudah kamu masukkan memakai `git add`, siap di-*commit*.
3. **Riwayat lokal (*commit* lokal):** sudah di-`git commit`, tetapi masih di laptopmu (belum di-`git push`).
4. **Sudah di server (*remote*):** sudah telanjur dikirim lewat `git push` ke GitHub/GitLab.

Perintah pembatalan yang aman berbeda-beda tergantung di tahap mana kesalahanmu berada.

## Tabel panduan cepat

| Posisi kesalahan | Perintah yang dipakai | Apa yang terjadi pada kodemu? |
|---|---|---|
| Salah edit berkas, belum `git add` | `git restore <berkas>` | Editan di berkas itu dibuang, kembali bersih seperti *commit* terakhir. |
| Telanjur `git add`, mau keluarkan dari antrean | `git restore --staged <berkas>` | Berkas keluar dari *staging*, tetapi hasil ketikanmu tetap utuh di editor. |
| Salah *commit* di laptop (belum `git push`) | `git reset --soft HEAD~1` | Bungkus *commit* terakhir dilepas, semua editanmu tetap rapi di *staging*. |
| Salah *commit* dan sudah telanjur `git push` | `git revert <hash>` | Membuat *commit* baru yang membalik perubahan tanpa merusak riwayat teman. |

## 1. Membuang editan di meja kerja (belum `git add`)

Kalau kamu baru mencoba-coba mengacak satu berkas untuk eksperimen lalu ingin mengembalikannya ke kondisi bersih sesuai *commit* terakhir, gunakan `git restore`:

```bash
git restore src/components/LoginForm.tsx
```

> **Hati-hati:** Begitu perintah ini dijalankan, semua ketikan yang belum di-*stage* di berkas tersebut **langsung hilang**. Jika kamu cuma ingin membuang beberapa baris tertentu saja dan mempertahankan sisanya, tambahkan opsi `-p` (`git restore -p src/components/LoginForm.tsx`) agar kamu bisa memilih per potongan.

## 2. Mengeluarkan berkas yang telanjur di-`git add`

Kejadian paling sering: mengetik `git add .` terlalu cepat, lalu sadar ada berkas konfigurasi lokal yang belum seharusnya ikut di-*commit*. Keluarkan lagi dari *staging area* tanpa menghapus isi editannya memakai opsi `--staged`:

```bash
git restore --staged config.local.yaml
```

Jika ingin mengeluarkan semua berkas sekaligus dari *staging area*, ganti nama berkasnya dengan tanda titik (`git restore --staged .`). Isi berkasmu di code editor tidak akan hilang sama sekali.

## 3. Membongkar *commit* terakhir yang masih di lokal (belum `git push`)

Baru selesai menekan Enter untuk `git commit`, eh langsung sadar ternyata kamu salah *branch* atau lupa menjalankan tes. Selama *commit* itu **belum dikirim ke server (`git push`)**, kamu aman membongkarnya memakai `reset --soft`:

```bash
git reset --soft HEAD~1
```

Apa arti `HEAD~1`? `HEAD` adalah posisimu sekarang, dan `~1` artinya mundur satu *commit* ke belakang. Karena memakai `--soft`, Git hanya membatalkan pembungkusan *commit*-nya dan membiarkan seluruh ketikanmu tetap rapi menunggu di dalam *staging area*. Kamu tinggal memperbaiki bagian yang keliru, lalu `git commit` lagi.

Ada juga pilihan `--mixed` (yang menjadi bawaan jika kamu mengetik `git reset HEAD~1` tanpa `--soft`). Bedanya tipis: perubahan kodemu tetap aman di berkas, hanya saja dikeluarkan dari *staging area* sehingga kamu harus mengetik `git add` ulang.

## 4. Membatalkan *commit* yang sudah telanjur di-`git push` ke server

Jika *commit* yang keliru sudah telanjur naik ke `origin/main` atau *branch* yang dipakai bersama rekan setim, **jangan gunakan `git reset`**. Menarik mundur sejarah yang sudah diunduh orang lain akan membuat repositori teman setimmu bentrok saat mereka menjalankan `git pull`.

Cara yang aman dan sopan untuk tim adalah memakai `git revert <hash>` (`hash` adalah kode ID unik sebuah *commit*, seperti `a4f81c2`, yang bisa kamu lihat dari `git log --oneline`):

```bash
git revert a4f81c2
git push
```

`git revert` tidak menghapus masa lalu, melainkan **membuat satu *commit* baru** yang isinya kebalikan persis dari *commit* `a4f81c2`: baris yang tadinya ditambahkan akan dihapus, dan baris yang tadinya dihapus akan dikembalikan. Karena riwayat *branch* tetap maju ke depan, semua rekan setim bisa menarik pembaruannya dengan aman.

## Kapan boleh memakai `git reset --hard`?

Hanya jalankan `git reset --hard HEAD` kalau kamu sudah 100% yakin ingin membuang **seluruh** perubahan di meja kerja maupun *staging area* hingga kembali persis seperti *commit* terakhir tanpa sisa. Sebelum menekan Enter, biasakan cek dulu `git status -sb` untuk memastikan tidak ada kode penting yang ikut terbuang.

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
