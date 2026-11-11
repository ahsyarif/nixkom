---
title: "Berhenti pakai git checkout untuk semuanya: pakai switch dan restore"
date: 2026-11-11T14:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Sejak Git 2.23, tugas git checkout dipecah jadi git switch khusus urusan branch dan git restore khusus urusan berkas."
---

Buat yang baru belajar Git, `git checkout` itu perintah paling membingungkan karena punya dua pekerjaan yang sama sekali tidak nyambung: pindah *branch* sekaligus menimpa isi berkas. Salah ketik sedikit saja, kamu bisa tidak sengaja menghapus editan berkas padahal niatnya cuma mau pindah *branch*. Sejak Git 2.23, pengembang Git memecah tugas itu menjadi dua perintah yang jelas batasannya: `git switch` khusus mengurus *branch*, dan `git restore` khusus mengurus berkas.

## Tabel pengganti `git checkout`

| Tugas | Perintah lama (`checkout`) | Perintah baru (`switch` / `restore`) |
|---|---|---|
| Pindah ke *branch* lain | `git checkout main` | `git switch main` |
| Bikin *branch* baru lalu pindah ke situ | `git checkout -b feat/login` | `git switch -c feat/login` |
| Balik ke *branch* sebelumnya | `git checkout -` | `git switch -` |
| Buang editan lokal di satu berkas | `git checkout -- App.tsx` | `git restore App.tsx` |
| Ambil isi berkas dari *branch* atau *commit* lain | `git checkout main -- App.tsx` | `git restore -s main App.tsx` |

## Kenapa `git checkout` rawan bikin celaka?

Bayangkan kamu punya *branch* bernama `config` sekaligus berkas bernama `config` di folder yang sama. Waktu kamu mengetik `git checkout config`, Git harus menebak apakah kamu mau pindah ke *branch* `config` atau membuang perubahan di berkas `config`. Lebih parah lagi kalau nama *branch* yang kamu ketik ternyata salah eja tapi kebetulan cocok dengan nama folder: isi folder itu langsung ditimpa ulang tanpa peringatan.

Dengan memisahkan perintahnya:
- `git switch` **tidak akan pernah** menimpa satu berkas individual. Kalau nama yang kamu ketik bukan nama *branch*, perintahnya langsung menolak jalan.
- `git restore` **tidak akan pernah** memindahkan posisi *branch*-mu.

## Pindah dan bikin branch dengan `git switch`

Untuk berpindah antar-*branch* sehari-hari:

```bash
git switch main
git switch -c feat/pembayaran   # -c (--create) buat bikin branch baru
git switch -                    # loncat balik ke branch sebelumnya (mirip cd -)
```

Kalau kamu mau membuat *branch* baru dari titik awal tertentu (misalnya langsung dari `origin/main` tanpa harus pindah ke `main` dulu), sebutkan titik awalnya di ujung:

```bash
git fetch origin
git switch -c hotfix/kupon origin/main
```

## Mengembalikan isi berkas dengan `git restore`

Kalau mau membatalkan editan di satu berkas supaya kembali seperti *commit* terakhir (`HEAD`):

```bash
git restore src/components/Navbar.tsx
```

Kalau mau mengambil versi berkas `Navbar.tsx` dari *branch* lain atau dari tiga *commit* sebelumnya, gunakan opsi `-s` (`--source`):

```bash
git restore -s main src/components/Navbar.tsx
git restore -s HEAD~3 src/components/Navbar.tsx
```

Berkas `Navbar.tsx` di folder kerjamu langsung berubah mengikuti versi sumber yang kamu tunjuk, siap untuk kamu periksa lewat `git diff` sebelum di-*commit*.

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
