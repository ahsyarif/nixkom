---
title: "Konfigurasi Git yang sebaiknya langsung kamu aktifkan"
date: 2026-11-11T08:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "config"]
description: "Setelan ~/.gitconfig biar git pull, merge conflict, diff, dan push cabang baru nggak bikin kerja dua kali."
---

Setelan bawaan Git itu sengaja kaku supaya skrip lama dari sepuluh tahun lalu nggak mendadak rusak. Kalau kamu pakai Git tiap hari di terminal, 16 baris di `~/.gitconfig` ini langsung memangkas banyak ketikan berulang: nggak perlu lagi nulis `-u origin` waktu *push* cabang baru, *diff* jadi lebih gampang dibaca saat fungsi pindah tempat, dan konflik *rebase* yang sama nggak perlu dibereskan dua kali.

## Cara pasang

Kamu bisa pasang satu-satu lewat `git config --global <kunci> <nilai>`, atau langsung tempel ke berkas `~/.gitconfig`. Buat ngecek setelan mana saja yang aktif dan datangnya dari berkas mana:

```bash
git config --global <kunci> <nilai>
git config --global --list --show-origin
```

## Daftar setelan

| Setelan | Nilai | Efeknya |
|---|---|---|
| `init.defaultBranch` | `main` | Cabang awal waktu `git init` langsung bernama `main`. |
| `pull.rebase` | `true` | `git pull` otomatis *rebase*, nggak bikin *merge commit* tambahan. |
| `rebase.autoStash` | `true` | Simpan perubahan lokal otomatis sebelum *rebase*, lalu kembalikan lagi sesudahnya. |
| `rebase.autoSquash` | `true` | *Commit* bertanda `fixup!` dan `squash!` langsung disusun ke tempatnya waktu `rebase -i`. |
| `rebase.updateRefs` | `true` | Cabang bertumpuk (*stacked branches*) ikut digeser waktu *rebase*. |
| `push.autoSetupRemote` | `true` | *Push* cabang baru otomatis nyambung ke *upstream* tanpa `-u origin <cabang>`. |
| `fetch.prune` | `true` | Bersihkan referensi `origin/*` lokal yang cabangnya sudah dihapus di server. |
| `rerere.enabled` | `true` | Ingat cara kamu membereskan konflik supaya konflik yang sama dibereskan otomatis. |
| `merge.conflictStyle` | `zdiff3` | Tampilkan isi asli (*base*) di tengah blok konflik. |
| `diff.algorithm` | `histogram` | *Diff* lebih rapi waktu fungsi atau blok kode pindah posisi. |
| `diff.colorMoved` | `default` | Kasih warna beda buat baris yang cuma pindah tempat vs baris yang beneran baru. |
| `branch.sort` | `-committerdate` | `git branch` diurutkan dari cabang yang paling baru kamu sentuh. |
| `tag.sort` | `version:refname` | Urutkan *tag* sebagai nomor versi (`v1.10` muncul sesudah `v1.9`, bukan sesudah `v1.1`). |
| `column.ui` | `auto` | Daftar `git branch`, `tag`, dan `status` disusun per kolom mengikuti lebar terminal. |
| `commit.verbose` | `true` | Tampilkan isi *diff* lengkap di bagian bawah editor waktu nulis pesan *commit*. |
| `help.autocorrect` | `prompt` | Kalau salah ketik perintah, Git tanya dulu sebelum menjalankan tebakannya. |

## Versi siap salin

Tempel blok ini ke `~/.gitconfig`:

```ini
[init]
	defaultBranch = main
[pull]
	rebase = true
[rebase]
	autoStash = true
	autoSquash = true
	updateRefs = true
[push]
	autoSetupRemote = true
[fetch]
	prune = true
[rerere]
	enabled = true
[merge]
	conflictStyle = zdiff3
[diff]
	algorithm = histogram
	colorMoved = default
[branch]
	sort = -committerdate
[tag]
	sort = version:refname
[column]
	ui = auto
[commit]
	verbose = true
[help]
	autocorrect = prompt
```

## Tiga setelan yang paling terasa bedanya

### `rerere`

`rerere` (*reuse recorded resolution*) merekam bentuk kode sebelum dan sesudah kamu membereskan konflik. Kalau kamu lagi *rebase* cabang panjang yang terdiri dari belasan *commit*, atau ngetes gabung cabang berulang kali, Git langsung menerapkan perbaikan yang sudah pernah kamu tulis tanpa minta diedit manual lagi.

### `zdiff3`

Tampilan konflik bawaan Git cuma ngasih lihat versi `HEAD` dan versi cabang lawan. Masalahnya, kita sering lupa kode aslinya kayak apa sebelum dua-duanya mengubah baris itu. Dengan `zdiff3`, Git menyelipkan blok `|||||||` berisi kode awal (*common ancestor*) dan mengeluarkan baris yang kembar di kedua sisi dari penanda konflik:

```text
<<<<<<< HEAD
timeout := 5 * time.Second
||||||| merged common ancestors
timeout := 3 * time.Second
=======
timeout := 10 * time.Second
>>>>>>> feature/retry
```

Begitu lihat aslinya `3 * time.Second`, langsung kelihatan kalau satu sisi menaikkan jadi 5 detik dan sisi lain menaikkan jadi 10 detik.

### `push.autoSetupRemote`

Biasanya waktu habis bikin cabang baru lalu ketik `git push`, Git nolak dan nyuruh kamu mengulang dengan `git push --set-upstream origin nama-cabang`. Begitu `push.autoSetupRemote = true` aktif, cukup `git push` sekali dan Git otomatis membuat sekaligus menyambungkan cabang yang sama di server.

Catatan versi: `merge.conflictStyle = zdiff3` butuh Git 2.35 ke atas, `push.autoSetupRemote` butuh Git 2.37 ke atas, dan `rebase.updateRefs` butuh Git 2.38 ke atas. Cek versi di mesinmu lewat `git --version`.

## Seri tips Git

1. **Konfigurasi Git yang sebaiknya langsung kamu aktifkan**
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
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
