---
title: "Salah reset atau hapus branch? Pulihkan dengan git reflog"
date: 2026-11-11T17:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Selama sudah pernah di-commit, kode yang hilang gara-gara git reset --hard atau git branch -D masih bisa ditarik balik lewat git reflog."
---

Pernah merasa jantung mau copot karena tidak sengaja menjalankan `git reset --hard HEAD~3` atau menghapus *branch* memakai `git branch -D`, lalu saat mengecek `git log` kerjaan seharian tampak lenyap tak berbekas?

Tarik napas dulu—jangan buru-buru pasrah! Selama kode tersebut **sudah pernah di-*commit*** di laptopmu, Git sebenarnya belum langsung membuang datanya dari penyimpanan. Di balik layar, Git punya buku catatan harian bernama **`reflog`** (*reference logs*) yang diam-diam mencatat setiap kali posisi `HEAD` (penunjuk posisimu saat ini) berpindah tempat.

## 1. Mencari jejak *commit* yang "hilang"

Buka terminal di dalam folder proyekmu dan jalankan:

```bash
git reflog
```

Git akan menampilkan daftar urutan langkah terbaru yang kamu lakukan di repo lokalmu, lengkap dengan kode ID unik (*hash*) di kolom paling kiri:

```text
c8204ab (HEAD -> main) HEAD@{0}: reset: moving to HEAD~3
a4f81c2 HEAD@{1}: commit: feat: tambah validasi kupon diskon
79b3e10 HEAD@{2}: commit: refactor: rapikan hitung pajak
31d09fa HEAD@{3}: checkout: moving from main to feat/diskon
```

Cara membacanya dari atas ke bawah (dari kejadian paling baru ke yang lebih lama):
- Baris `HEAD@{0}` adalah catatan saat kamu salah menjalankan `reset` tadi.
- Tepat satu baris di bawahnya (`HEAD@{1}` dengan *hash* `a4f81c2`) adalah posisi aman terakhir **sebelum kesalahan terjadi**!

## 2. Mengembalikan *commit* yang hilang karena `reset --hard`

Begitu kamu menemukan kode *hash* posisi sebelum kejadian (pada contoh di atas `a4f81c2`), kembalikan posisi *branch*-mu langsung ke titik itu:

```bash
git reset --hard a4f81c2
```

Sekarang cek lagi dengan `git log --oneline`. Semua *commit* yang tadi sempat menghilang langsung kembali utuh seperti semula!

## 3. Menghidupkan lagi *branch* yang tidak sengaja terhapus

Bagaimana kalau kamu tidak sengaja menghapus sebuah *branch*—misalnya `git branch -D feat/diskon`—padahal isinya belum sempat digabung ke `main`?

Jangan panik. Jalankan `git reflog`, cari baris terakhir saat kamu berada di *branch* itu (atau *commit* terakhir yang dibuat di sana, misalnya `a4f81c2`), lalu buat ulang *branch*-nya tepat di titik *hash* tersebut:

```bash
git switch -c feat/diskon a4f81c2
```

*Branch* `feat/diskon` pun langsung hidup lagi lengkap dengan seluruh riwayat *commit*-nya.

## 4. Dua batasan yang wajib diingat

Meskipun `git reflog` terasa seperti mesin waktu, ada dua batasan yang harus kamu pahami:
1. **`git reflog` hanya bisa menyelamatkan perubahan yang sudah pernah di-*commit*.** Kalau kamu mengedit kode seharian tanpa pernah menjalankan `git commit` sekali pun, lalu menimpanya dengan `git reset --hard` atau `git restore`, editan itu tidak tercatat di `reflog` dan benar-benar hilang.
2. **Catatan `reflog` hanya ada di laptopmu sendiri dan punya batas waktu.** Catatan ini tidak ikut di-*push* ke server. Selain itu, Git secara bawaan hanya menyimpan jejak *commit* yang sudah tidak terikat ke *branch* mana pun (*unreachable commits*) selama **30 hari** sebelum akhirnya disapu bersih otomatis oleh mekanisme pembersihan Git (*garbage collector* / `git gc`). Jadi kalau sadar ada yang salah hapus, segera pulihkan hari itu juga!

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
