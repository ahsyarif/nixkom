---
title: "Cara membaca dan menyelesaikan merge conflict tanpa panik"
date: 2026-11-11T18:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Memahami arti penanda <<<<<<< HEAD, =======, dan >>>>>>> waktu gabung branch, plus tombol darurat buat membatalkan merge."
---

Melihat tulisan `CONFLICT (content): Merge conflict` di terminal sering bikin pemula langsung panik dan takut proyeknya rusak.

Padahal, ***merge conflict* bukan berarti Git-mu error atau rusak!** Konflik terjadi karena situasi yang sangat wajar: kamu dan rekan setimmu sama-sama mengubah **baris yang sama di berkas yang sama** pada dua *branch* berbeda. Karena keduanya sama-sama berubah, Git tidak berani menebak versi siapa yang lebih benar. Jadi Git berhenti sejenak dan memintamu memilih secara manual.

Tugasmu sederhana: buka berkas tersebut, pilih (atau gabungkan) bentuk kode yang benar, lalu hapus garis-garis pembatas dari Git.

## 1. Cara membaca tanda pembatas konflik

Saat proses penggabungan berhenti karena konflik, cek daftar berkas yang bermasalah lewat `git status` (di sebelah kirinya akan bertuliskan `both modified`). Buka berkas itu di code editor, kamu akan melihat blok tanda seperti ini:

```text
  <<<<<<< HEAD
  const maxRetries = 5;
  =======
  const maxRetries = 3;
  >>>>>>> feat/atur-retry
```

*(Catatan: pada berkas asli, tanda `<<<<<<<`, `=======`, dan `>>>>>>>` muncul rata paling kiri tanpa spasi di depannya).*

Cara membacanya cuma terbagi dua:
- **Bagian atas** (antara `<<<<<<< HEAD` sampai `=======`): ini kodemu sendiri yang sedang aktif di *branch* tempatmu berdiri sekarang (`HEAD`).
- **Bagian bawah** (antara `=======` sampai `>>>>>>> feat/atur-retry`): ini kode baru yang datang dari *branch* `feat/atur-retry` yang sedang kamu coba gabungkan.

**Tip:** Jika kamu sudah menyalakan `merge.conflictStyle = zdiff3` sesuai [artikel konfigurasi Git wajib](/posts/git-config-wajib/), Git juga menampilkan satu bagian tengah bertanda `||||||| merged common ancestors` yang berisi **kode asli mula-mula** sebelum kamu maupun temanmu mengubahnya—jauh lebih mudah untuk memahami konteksnya!

## 2. Empat langkah menyelesaikan konflik

1. **Lihat berkas mana saja yang bentrok:**
   Jalankan `git status -sb`. Berkas yang masih mengalami konflik ditandai huruf **`UU`** (artinya *unmerged*) di sebelah kiri namanya.
2. **Edit berkas dan hapus bersih semua tanda pembatas:**
   Putuskan apakah kamu mau memakai versi atas, versi bawah, atau menggabungkan keduanya. **Pastikan kamu menghapus bersih** ketiga baris penanda `<<<<<<<`, `=======`, dan `>>>>>>>`—kalau sampai tertinggal satu baris saja, kodemu tidak akan bisa dijalankan atau dikompilasi:

```javascript
const maxRetries = 5;
```

3. **Tandai berkas sudah beres memakai `git add`:**
   Di Git, cara memberi tahu bahwa konflik pada sebuah berkas sudah selesai kamu bereskan adalah memasukkannya ke *staging area*:

```bash
git add src/api/retry.ts
```

4. **Selesaikan proses penggabungan:**
   Setelah semua berkas bertanda `UU` selesai di-`git add`, tutup penggabungan dengan membuat *commit*:

```bash
git commit
```

*(Catatan: jika konfliknya terjadi saat menjalankan `git rebase`, langkah ke-4 bukan `git commit`, melainkan `git rebase --continue`).*

## 3. Mengintip alasan temanmu mengubah baris itu

Sebelum buru-buru menghapus versi temanmu (bagian bawah), sebaiknya cari tahu dulu kenapa dia mengubah baris tersebut. Kamu tidak perlu bolak-balik membuka GitHub—jalankan saja perintah ini di terminal untuk melihat *commit* dari kedua sisi yang menyentuh berkas tersebut:

```bash
git log --merge -p nama-berkas.js
```

Dari pesan *commit* dan potongan perubahan (*diff*) yang tampil, kamu langsung tahu maksud perubahan rekanmu sehingga tidak salah menghapus kode penting.

## 4. Tombol darurat: batalkan dan mulai ulang dari awal

Jika di tengah proses membereskan konflik kamu merasa salah hapus banyak baris dan isi berkasnya malah makin kacau, jangan panik! Kamu bisa langsung membatalkan seluruh proses *merge* sehingga semua berkas kembali bersih seperti sebelum kamu mengetik `git merge`:

```bash
git merge --abort
```

Kalau konflik terjadi saat `rebase` atau `cherry-pick`, tombol daruratnya juga mirip: `git rebase --abort` atau `git cherry-pick --abort`.

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
11. **Cara membaca dan menyelesaikan merge conflict tanpa panik**
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
