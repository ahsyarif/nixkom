---
title: "Beda git fetch dan git pull: intip perubahan server sebelum digabung"
date: 2026-11-11T19:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Kenapa membiasakan git fetch dulu sebelum menggabungkan kode bikin kerjaan lokalmu jauh lebih aman dari konflik dadakan."
---

Banyak pemula mengira `git fetch` dan `git pull` itu dua perintah yang fungsinya sama. Padahal `git pull` sebenarnya gabungan dari dua langkah sekaligus: menjalankan `git fetch` terlebih dulu, lalu langsung disambung dengan `git merge` (atau `git rebase`) ke *branch* yang sedang kamu buka. Kalau kamu langsung mengetik `git pull` saat kondisi kerjaan lokal masih berantakan, kode dari server langsung ditabrakkan ke berkas lokalmu detik itu juga.

## Perbandingan singkatnya

| Perintah | Apa yang diunduh? | Menyentuh berkas di folder kerjamu? | Risiko konflik langsung |
|---|---|---|---|
| `git fetch` | Mengunduh *commit* terbaru dari server ke catatan `origin/*`. | **Tidak sama sekali.** Berkas lokal dan *branch* lokalmu tidak berubah. | Nol (selalu aman dijalankan kapan saja). |
| `git pull` | Mengunduh *commit* dari server, lalu langsung menggabungkannya ke *branch* aktif. | **Ya.** Berkas di folder kerjamu langsung ikut berubah. | Bisa langsung memicu *merge conflict*. |

## Apa yang sebenarnya terjadi waktu `git fetch`?

Di dalam repositori lokalmu, Git menyimpan dua jenis penunjuk untuk *branch* `main`:
1. `main`: posisi *branch* lokal tempat kamu bekerja dan membuat *commit*.
2. `origin/main`: catatan lokal tentang posisi `main` di server terakhir kali laptopmu bertanya ke GitHub/GitLab.

Saat kamu menjalankan `git fetch`:

```bash
git fetch origin
```

Git hanya memperbarui penunjuk `origin/main` supaya sama dengan keadaan terbaru di server, tanpa mengutak-atik *branch* `main` lokal maupun berkas yang sedang kamu buka di editor.

## Cara mengintip apa saja yang baru di server

Sesudah menjalankan `git fetch origin`, kamu bebas memeriksa dulu perubahan apa saja yang baru dimasukkan oleh rekan setimmu sebelum memutuskan untuk menggabungkannya:

```bash
# Lihat daftar commit di server yang belum ada di branch lokalmu
git log HEAD..origin/main --oneline

# Lihat daftar berkas apa saja yang berubah beserta jumlah barisnya
git diff --stat HEAD..origin/main
```

Kalau dari daftar tersebut kelihatan ada teman yang baru saja merombak berkas yang juga sedang kamu edit di lokal, kamu bisa merapikan atau menyimpan (*commit* / *stash*) pekerjaan lokalmu dulu dengan tenang.

## Baru gabungkan kalau sudah siap

Begitu kamu sudah yakin perubahan dari server aman untuk masuk ke folder kerjamu, gabungkan ke *branch* aktif:

```bash
git rebase origin/main
# atau kalau timmu memakai alur merge:
git merge origin/main
```

Menjalankan `git fetch` lalu `git rebase origin/main` hasil akhirnya persis sama dengan `git pull --rebase`, tapi memberimu jeda untuk melihat isi perubahan dari server sebelum kodenya benar-benar menyentuh folder kerjamu.

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
12. **Beda git fetch dan git pull: intip perubahan server sebelum digabung**
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
