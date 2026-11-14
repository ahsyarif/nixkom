---
title: "Berhenti pakai git checkout untuk semuanya: pakai switch dan restore"
date: 2026-11-11T14:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Sejak Git 2.23, tugas git checkout dipecah jadi git switch khusus urusan branch dan git restore khusus urusan berkas."
---

Bagi pemula yang baru belajar Git, `git checkout` adalah salah satu perintah yang paling sering membuat bingung. Kenapa? Karena satu kata `checkout` dipakai untuk dua pekerjaan yang sama sekali tidak nyambung: **pindah *branch*** sekaligus **membuang/menimpa isi berkas**!

Salah mengetik satu tanda baca saja, kamu bisa tidak sengaja menghapus editan berkas padahal niat awalnya hanya ingin berpindah *branch*.

Karena masalah itulah, sejak Git versi 2.23, pengembang Git memisahkan tugas `checkout` menjadi dua perintah yang jauh lebih jelas batasannya:
- **`git switch`**: khusus mengurus **pindah atau membuat *branch***.
- **`git restore`**: khusus mengurus **mengembalikan isi berkas**.

## 1. Contekan pengganti `git checkout`

Jika di tutorial lama kamu masih melihat `git checkout`, inilah padanan modern yang lebih aman:

| Tugas yang ingin dilakukan | Perintah lama (`checkout`) | Perintah baru (`switch` / `restore`) |
|---|---|---|
| Pindah ke *branch* lain | `git checkout main` | `git switch main` |
| Bikin *branch* baru lalu langsung pindah ke situ | `git checkout -b feat/login` | `git switch -c feat/login` |
| Balik cepat ke *branch* sebelumnya | `git checkout -` | `git switch -` |
| Buang editan lokal di satu berkas | `git checkout -- App.tsx` | `git restore App.tsx` |
| Ambil isi berkas dari *branch* atau *commit* lain | `git checkout main -- App.tsx` | `git restore -s main App.tsx` |

## 2. Kenapa `git checkout` rawan membuat celaka?

Bayangkan di folder proyekmu kamu punya *branch* bernama `config` sekaligus punya berkas atau folder bernama `config`. Saat kamu mengetik `git checkout config`, Git harus menebak-nebak apakah kamu mau pindah ke *branch* `config` atau mau membuang perubahan di berkas `config`. Lebih bahaya lagi kalau nama *branch* yang kamu ketik ternyata salah eja, tetapi kebetulan namanya sama dengan nama sebuah folder—isi folder itu bisa langsung ditimpa ulang tanpa peringatan!

Dengan memisahkan perintahnya:
- `git switch` **tidak akan pernah** menimpa satu berkas. Jika nama yang kamu ketik bukan nama *branch*, perintahnya langsung berhenti dengan pesan error yang aman.
- `git restore` **tidak akan pernah** memindahkanmu ke *branch* lain.

## 3. Cara pindah dan membuat *branch* dengan `git switch`

Untuk aktivitas berpindah antar-*branch* sehari-hari:

```bash
git switch main
git switch -c feat/pembayaran   # -c (--create) untuk membuat branch baru lalu masuk ke sana
git switch -                    # loncat kembali ke branch sebelumnya (mirip perintah cd -)
```

Jika kamu ingin membuat *branch* baru yang langsung berangkat dari kondisi server terbaru (`origin/main`) tanpa harus repot pindah ke `main` lokal dulu, tambahkan titik awalnya di belakang perintah:

```bash
git fetch origin
git switch -c hotfix/kupon origin/main
```

## 4. Cara mengembalikan isi berkas dengan `git restore`

Jika kamu ingin membatalkan editan pada satu berkas agar kembali persis seperti saat *commit* terakhir (`HEAD`):

```bash
git restore src/components/Navbar.tsx
```

Jika kamu ingin mengambil versi berkas `Navbar.tsx` dari *branch* lain (misalnya `main`) atau dari tiga *commit* sebelumnya (`HEAD~3`), tambahkan opsi `-s` (`--source`, artinya sumber versi):

```bash
git restore -s main src/components/Navbar.tsx
git restore -s HEAD~3 src/components/Navbar.tsx
```

Berkas `Navbar.tsx` di folder kerjamu langsung berubah mengikuti versi sumber yang kamu pilih, sehingga kamu bisa mengecek perbedaannya memakai `git diff` sebelum memasukkannya ke *commit* baru.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. **Berhenti pakai git checkout untuk semuanya: pakai switch dan restore**
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
