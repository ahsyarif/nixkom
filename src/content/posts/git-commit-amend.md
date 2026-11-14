---
title: "Rapikan commit terakhir sebelum push dengan git commit --amend"
date: 2026-11-11T20:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Salah ketik pesan commit atau lupa menyertakan satu berkas? Gabungkan langsung ke commit terakhir tanpa bikin commit 'fix typo' tambahan."
---

Baru saja menekan Enter pada perintah `git commit`, dua detik kemudian kamu sadar ada salah ketik di pesan *commit* atau ada satu berkas yang ketinggalan belum masuk!

Pemula biasanya langsung membuat *commit* baru berisi pesan `"fix typo"` atau `"lupa masukin file"`. Sebenarnya kamu tidak perlu mengotori riwayat proyek dengan *commit* tambalan seperti itu—kamu bisa langsung memperbaiki dan menambal *commit* paling akhir memakai opsi **`--amend`**.

## 1. Memperbaiki pesan *commit* terakhir

Jika isi berkas sudah benar dan kamu cuma ingin mengganti kalimat pesan pada *commit* terakhir, jalankan:

```bash
git commit --amend -m "feat: hitung otomatis ongkos kirim berdasarkan berat"
```

Pesan yang lama langsung diganti dengan kalimat baru tanpa menambah jumlah *commit* di `git log`. Jika kamu menjalankan `git commit --amend` **tanpa** `-m "..."`, Git akan membuka editor teks bawaan agar kamu bisa mengedit pesan sebelumnya (sangat berguna kalau pesan *commit*-nya panjang).

## 2. Menyelipkan berkas yang ketinggalan

Misalnya setelah melakukan *commit*, kamu baru sadar ada satu berkas tes yang lupa di-`git add`, atau masih kurang satu titik koma di berkas lain. Cukup masukkan berkas itu ke *staging area* lewat `git add`, lalu tempelkan ke *commit* terakhir menggunakan **`--no-edit`**:

```bash
git add src/utils/shipping.test.ts
git commit --amend --no-edit
```

Opsi `--no-edit` memberi tahu Git agar tetap memakai pesan *commit* yang sudah ada tanpa perlu membuka editor teks lagi.

> **Catatan:** Pastikan tidak ada perubahan lain yang tidak diinginkan sedang mengantre di *staging area* sebelum menjalankan `--amend`, karena semua isi *staging area* akan otomatis ikut tergabung ke dalam *commit* terakhir tersebut.

## 3. Memperbaiki nama/email penulis pada *commit* terakhir

Kalau kamu baru selesai mengatur email kantor tetapi satu *commit* terakhir tadi telanjur tercatat atas nama email pribadimu, kamu bisa memperbarui identitas penulis pada *commit* terakhir itu dengan `--reset-author`:

```bash
git commit --amend --reset-author --no-edit
```

Git langsung memperbarui nama dan alamat email pada *commit* terakhir mengikuti setelan `user.name` dan `user.email` yang sedang aktif sekarang.

## 4. Aturan emas: jangan `--amend` *commit* yang sudah di-`push` ke *branch* bersama!

Penting untuk memahami cara kerja di balik layar: `git commit --amend` sebenarnya tidak benar-benar "mengedit" *commit* lama, melainkan **membuang *commit* terakhir lalu menggantinya dengan *commit* baru** yang memiliki kode ID (*hash*) berbeda.

Karena kode *hash*-nya berubah, ikuti aturan aman ini:
- **Masih di laptopmu (belum di-*push*):** silakan pakai `--amend` sesuka hati, aman 100%.
- **Sudah di-*push* ke *branch* fitur milikmu sendiri:** masih boleh memakai `--amend`, tetapi sesudahnya kamu harus mengirim ulang dengan `git push --force-with-lease`.
- **Sudah di-*push* ke `main` atau *branch* yang dipakai ramai-ramai:** **jangan pernah di-`--amend`!** Buat saja *commit* baru seperti biasa supaya riwayat *commit* rekan setimmu tidak bentrok dan berantakan.

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
