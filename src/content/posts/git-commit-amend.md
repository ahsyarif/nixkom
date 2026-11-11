---
title: "Rapikan commit terakhir sebelum push dengan git commit --amend"
date: 2026-11-11T20:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Salah ketik pesan commit atau lupa menyertakan satu berkas? Gabungkan langsung ke commit terakhir tanpa bikin commit 'fix typo' tambahan."
---

Baru dua detik selesai menekan `Enter` pada perintah `git commit`, mata langsung menangkap salah ketik di pesan *commit* atau sadar ada satu berkas yang lupa di-*add*. Daripada membuat *commit* baru berisi pesan `"fix typo"` atau `"lupa masukin file"`, tambal langsung *commit* terakhir itu menggunakan opsi `--amend`.

## 1. Memperbaiki pesan commit terakhir

Kalau tidak ada berkas tambahan yang mau dimasukkan dan kamu cuma ingin mengganti kalimat pesan pada *commit* paling atas, jalankan:

```bash
git commit --amend -m "feat: hitung otomatis ongkos kirim berdasarkan berat"
```

Pesan lama langsung diganti dengan kalimat baru tanpa menambah jumlah *commit* di `git log`. Kalau kamu tidak menyertakan `-m "..."`, Git akan membuka teks editor bawaan supaya kamu bisa mengedit pesan sebelumnya yang panjang atau terdiri dari beberapa baris.

## 2. Menyelipkan berkas yang ketinggalan

Misalnya kamu habis melakukan *commit*, lalu sadar ada satu berkas tes yang tadi lupa di-*stage* atau masih kurang satu titik koma. Masukkan berkas yang tertinggal itu lewat `git add`, lalu tempelkan ke *commit* terakhir dengan menambahkan `--no-edit`:

```bash
git add internal/shipping/calc_test.go
git commit --amend --no-edit
```

Opsi `--no-edit` memberi tahu Git supaya memakai ulang pesan *commit* yang sudah ada tanpa perlu membuka teks editor lagi.

(Catatan: pastikan tidak ada perubahan lain di *staging area* ketika kamu menjalankan langkah pertama tadi, karena semua isi yang sedang ada di *staging area* bakal otomatis ikut tergabung saat `--amend` dijalankan).

## 3. Memperbaiki identitas penulis pada commit terakhir

Kalau kamu baru selesai mengatur email kantor tapi satu *commit* terakhir tadi telanjur tercatat memakai email pribadi, kamu juga bisa menambal identitas penulisnya lewat `--amend`:

```bash
git commit --amend --reset-author --no-edit
```

Git langsung memperbarui nama dan alamat email pada *commit* terakhir mengikuti konfigurasi `user.name` dan `user.email` yang aktif sekarang.

## Aturan emas: jangan amend commit yang sudah di-push ke branch bersama

Di balik layar, `git commit --amend` sebenarnya tidak mengedit *commit* lama, melainkan membuang *commit* terakhir lalu menggantinya dengan *commit* baru yang punya kode *hash* berbeda.

- **Kalau *commit* itu masih di lokal (belum di-*push*):** silakan pakai `--amend` sesuka hati.
- **Kalau sudah di-*push* ke *branch* fitur milikmu sendiri:** kamu masih boleh memakai `--amend`, tapi sesudahnya harus melakukan `git push --force-with-lease`.
- **Kalau sudah di-*push* ke `main` atau *branch* yang dipakai ramai-ramai:** **jangan di-*amend***. Buat saja *commit* baru seperti biasa supaya riwayat *commit* rekan setimmu tidak berantakan.

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
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. **Rapikan commit terakhir sebelum push dengan git commit --amend**
