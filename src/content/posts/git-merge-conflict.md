---
title: "Cara membaca dan menyelesaikan merge conflict tanpa panik"
date: 2026-11-11T18:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Memahami arti penanda <<<<<<< HEAD, =======, dan >>>>>>> waktu gabung branch, plus tombol darurat buat membatalkan merge."
---

*Merge conflict* itu bukan pesan galat yang berarti Git kamu rusak. Konflik muncul semata-mata karena kamu dan rekan setimmu mengubah baris yang sama pada berkas yang sama di dua *branch* berbeda, sehingga Git tidak berani menebak versi siapa yang harus dipakai. Tugasmu cuma membuka berkas itu, memilih bentuk kode yang benar, lalu menghapus garis pembatasnya.

## Cara membaca penanda konflik

Waktu Git berhenti karena konflik, buka berkas yang ditandai `both modified` pada `git status`. Di dalamnya kamu bakal menemukan blok pembatas seperti ini (pastikan tulisannya rata kiri tanpa spasi di depannya pada berkas aslimu):

```text
  <<<<<<< HEAD
  const maxRetries = 5;
  =======
  const maxRetries = 3;
  >>>>>>> feat/atur-retry
```

Artinya cuma dua bagian:
- **Bagian atas** (di antara `<<<<<<< HEAD` sampai `=======`): ini kode milikmu yang sedang aktif di *branch* tempat kamu berdiri sekarang (`HEAD`).
- **Bagian bawah** (di antara `=======` sampai `>>>>>>> feat/atur-retry`): ini kode baru yang datang dari *branch* `feat/atur-retry` yang sedang coba kamu gabungkan.

Tips: kalau kamu sudah mengaktifkan `merge.conflictStyle = zdiff3` seperti di [artikel konfigurasi Git wajib](/posts/git-config-wajib/), di tengah-tengahnya akan ada satu blok tambahan `||||||| merged common ancestors` yang memperlihatkan isi kode asli sebelum kamu maupun temanmu mengubahnya.

## Empat langkah membereskannya

1. **Cek berkas mana saja yang bentrok.** Jalankan `git status -sb`. Berkas yang mengalami konflik ditandai huruf `UU` di sebelah kirinya.
2. **Edit berkasnya dan bersihkan penandanya.** Putuskan mau memakai versi atas, versi bawah, atau gabungan keduanya. Setelah memilih, **hapus bersih** baris `<<<<<<<`, `=======`, dan `>>>>>>>` supaya kodenya bisa dikompilasi lagi:

```javascript
const maxRetries = 5;
```

3. **Tandai sudah selesai dengan `git add`.** Di Git, cara memberi tahu bahwa konflik pada satu berkas sudah beres adalah dengan memasukkannya ke *staging area*:

```bash
git add src/api/retry.ts
```

4. **Selesaikan proses penggabungan.** Kalau semua berkas yang bentrok sudah di-*add*, tutup dengan:

```bash
git commit
```

(Kalau konfliknya terjadi di tengah proses `git rebase`, ganti langkah keempat dengan `git rebase --continue`).

## Intip alasan teman mengubah baris itu

Jangan asal menghapus kode bagian bawah kalau belum tahu kenapa rekan kerjamu mengubahnya. Sebelum mengedit berkas yang bentrok, jalankan perintah ini buat melihat *commit* dari kedua sisi yang menyentuh bagian tersebut:

```bash
git log --merge -p nama-berkas.js
```

Dari pesan *commit* dan potongan *diff*-nya, kamu bisa langsung paham konteks perubahan temanmu tanpa harus bolak-balik membuka halaman GitHub.

## Tombol darurat: mulai ulang dari awal

Kalau di tengah jalan kamu salah hapus banyak baris dan isi berkasnya malah makin kacau, jangan panik. Batalkan saja seluruh proses *merge* supaya kedua *branch* kembali utuh seperti sebelum kamu mengetik `git merge`:

```bash
git merge --abort
```

Kalau sedang berada di tengah *rebase* atau *cherry-pick*, perintah daruratnya serupa: `git rebase --abort` atau `git cherry-pick --abort`.

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
