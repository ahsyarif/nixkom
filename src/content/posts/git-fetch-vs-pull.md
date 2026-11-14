---
title: "Beda git fetch dan git pull: cek perubahan sebelum digabung"
date: 2026-11-11T19:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Kenapa membiasakan git fetch dulu sebelum menggabungkan kode bikin kerjaan lokalmu jauh lebih aman dari konflik dadakan."
---

Banyak pemula mengira `git fetch` dan `git pull` adalah dua perintah yang sama-sama sekadar "mengambil kode dari server". Padahal ada perbedaan besar di antara keduanya!

`git pull` sebenarnya adalah jalan pintas yang menjalankan **dua langkah sekaligus**: mengunduh catatan terbaru dari server (`git fetch`), lalu **langsung menabrakkan/menggabungkannya** (`git merge` atau `git rebase`) ke dalam *branch* tempat kamu bekerja sekarang. Jika kerjaan lokalmu sedang berantakan, langsung menjalankan `git pull` bisa langsung memicu *merge conflict* mendadak di layar editor.

Bayangkan bedanya seperti menerima paket di kantor:
- **`git fetch`**: mengintip dulu daftar paket apa saja yang baru datang di pos satpam, tanpa membawanya masuk ke meja kerjamu.
- **`git pull`**: langsung menyuruh kurir membuka kardus dan menumpahkan seluruh isinya ke atas meja kerjamu saat itu juga!

## 1. Perbandingan singkat `fetch` vs `pull`

| Perintah | Apa yang dilakukan? | Mengubah berkas di folder kerjamu? | Risiko konflik langsung |
|---|---|---|---|
| `git fetch` | Mengunduh *commit* terbaru dari server ke catatan `origin/*`. | **Tidak sama sekali.** Berkas lokal dan *branch*-mu tetap utuh. | Nol (100% aman dijalankan kapan saja). |
| `git pull` | Mengunduh *commit* dari server, lalu langsung menggabungkannya ke *branch* aktif. | **Ya.** Berkas yang sedang kamu buka langsung berubah. | Bisa langsung memicu *merge conflict*. |

## 2. Apa yang sebenarnya terjadi saat `git fetch`?

Di dalam proyek lokalmu, Git sebenarnya menyimpan **dua catatan terpisah** untuk sebuah *branch* seperti `main`:
1. **`main`**: posisi *branch* lokal tempat kamu bekerja dan membuat *commit*.
2. **`origin/main`**: catatan lokal di laptopmu tentang di titik mana posisi `main` di server (`origin`, seperti GitHub/GitLab) terakhir kali laptopmu mengeceknya.

Ketika kamu menjalankan:

```bash
git fetch origin
```

Git hanya memperbarui catatan **`origin/main`** agar sesuai dengan keadaan terbaru di server—sama sekali tidak menyentuh `main` lokal maupun file-file yang sedang kamu edit di code editor.

## 3. Cara mengintip perubahan terbaru di server

Sesudah menjalankan `git fetch origin`, kamu bisa mengecek dengan tenang perubahan apa saja yang baru dikirim rekan setimmu sebelum menggabungkannya:

```bash
# Lihat daftar pesan commit baru di server yang belum masuk ke branch lokalmu
git log HEAD..origin/main --oneline

# Lihat berkas apa saja yang berubah beserta jumlah baris tambah/hapusnya
git diff --stat HEAD..origin/main
```

Kalau dari daftar tersebut kelihatan ada teman yang baru merombak berkas yang kebetulan juga sedang kamu ubah di laptop, kamu punya waktu untuk merapikan atau menitipkan pekerjaanmu (*commit* atau *stash*) terlebih dulu tanpa panik.

## 4. Gabungkan kalau sudah siap

Begitu kamu yakin perubahan dari server aman untuk masuk ke pekerjaanmu, barulah gabungkan ke *branch* aktif:

```bash
git rebase origin/main
# atau, jika timmu memakai alur merge biasa:
git merge origin/main
```

Menjalankan `git fetch` terlebih dulu lalu disambung `git rebase origin/main` hasil akhirnya persis sama dengan `git pull --rebase`—bedanya, kamu mendapat jeda berharga untuk mengintip apa yang berubah di server sebelum kodenya benar-benar menyentuh meja kerjamu.

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
