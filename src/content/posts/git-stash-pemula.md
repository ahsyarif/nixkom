---
title: "Titip kodingan setengah jadi dengan git stash"
date: 2026-11-11T16:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Cara menyimpan pekerjaan yang belum siap di-commit ke laci sementara waktu harus pindah branch mendadak."
---

Lagi setengah jalan ngerjain fitur, tiba-tiba kamu harus pindah ke *branch* `main` buat ngecek *bug* laporan pengguna. Begitu ketik `git switch main`, Git menolak karena berkas yang sedang kamu edit bakal tertimpa. Mau di-*commit* sekarang kodenya masih belum jalan, mau dihapus sayang. Di saat seperti ini, masukkan dulu pekerjaanmu ke laci sementara pakai `git stash`.

## 1. Simpan selalu dengan pesan dan opsi `-u`

Kebanyakan pemula cuma mengetik `git stash` polosan. Ada dua masalah kalau tanpa opsi:
1. Tumpukan *stash* cuma diberi label generik `WIP on nama-branch`, jadi kalau ada tiga tumpukan kamu bakal lupa mana yang isinya apa.
2. Berkas baru yang belum pernah di-*add* (*untracked*) **tidak ikut disimpan** dan tetap berceceran di folder kerja.

Biasakan selalu memakai `git stash push -u -m "keterangan"`:

```bash
git stash push -u -m "validasi form kupon belum kelar"
```

Opsi `-u` (`--include-untracked`) memastikan berkas baru ikut masuk ke laci penyimpanan, dan folder kerjamu langsung bersih kembali ke titik *commit* terakhir.

## 2. Lihat daftar dan intip isinya

Untuk melihat semua pekerjaan yang sedang dititipkan di laci *stash*:

```bash
git stash list
```

Hasilnya diurutkan dari yang paling baru masuk (`stash@{0}`):

```text
stash@{0}: On feat/checkout: validasi form kupon belum kelar
stash@{1}: On feat/login: coba ganti library session
```

Kalau lupa detail kode apa saja yang ada di dalam `stash@{0}`, intip dulu *diff*-nya pakai `show -p` sebelum dikembalikan:

```bash
git stash show -p stash@{0}
```

## 3. Ambil kembali dengan `pop` atau `apply`

Sesudah urusan di *branch* lain beres dan kamu balik ke *branch* semula, ambil kembali kodinganmu:

```bash
git stash pop
```

`git stash pop` mengambil tumpukan paling atas (`stash@{0}`), menerapkannya ke folder kerjamu, lalu otomatis menghapus catatan tersebut dari daftar *stash*. Kalau kamu mau mengambil tumpukan urutan lain, sebutkan nomornya seperti `git stash pop stash@{1}`.

Bedanya dengan `git stash apply`: perintah `apply` menempelkan kembali perubahanmu ke folder kerja, tapi **tetap menyimpan salinannya** di dalam daftar *stash*. Pakai `apply` kalau satu potongan perubahan yang sama ingin kamu tempelkan ke dua *branch* berbeda.

## 4. Bersih-bersih tumpukan yang tidak terpakai

Kalau satu tumpukan sudah tidak dibutuhkan lagi, hapus satu per satu dengan `drop`, atau kosongkan seluruh laci dengan `clear`:

```bash
git stash drop stash@{1}   # hapus satu tumpukan spesifik
git stash clear            # hapus SEMUA stash (tidak bisa dibatalkan)
```

Tip praktis: usahakan jangan menumpuk lebih dari dua atau tiga *stash* sampai berhari-hari. Kalau kamu sering harus mengerjakan dua *branch* besar secara bersamaan dalam waktu lama, lebih rapi membuka folder terpisah lewat `git worktree` daripada mengandalkan *stash*.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. **Titip kodingan setengah jadi dengan git stash**
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
