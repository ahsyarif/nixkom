---
title: "Konfigurasi Git yang sebaiknya langsung kamu aktifkan"
date: 2026-11-11T08:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "config"]
description: "Setelan ~/.gitconfig biar git pull, merge conflict, diff, dan push cabang baru nggak bikin kerja dua kali."
---

Waktu baru pertama kali menginstal Git, setelan bawaannya memang sengaja dibuat sangat "konservatif" supaya skrip-skrip lama dari sepuluh tahun lalu tidak rusak. Akibatnya, pemula sering direpotkan oleh hal-hal kecil—seperti harus mengetik perintah panjang saat mengirim *branch* baru ke server, atau bingung membaca tampilan kode yang bentrok (*merge conflict*).

Kenapa ini penting? Dengan menambahkan 16 baris pengaturan di file `~/.gitconfig` (file catatan setelan Git yang berlaku untuk semua proyek di komputermu), kerja harianmu di terminal langsung jauh lebih nyaman. Kamu nggak perlu lagi mengetik `-u origin` tiap kali *push* *branch* baru, tampilan perbandingan kode (*diff*) jadi lebih enak dibaca, dan bentrokan kode yang sama nggak perlu dibereskan berulang kali.

## Cara pasang

Kamu bisa memasangnya satu per satu lewat terminal dengan `git config --global <kunci> <nilai>`, atau langsung menempelkan blok konfigurasi lengkap di bagian bawah ke dalam file `~/.gitconfig`.

Untuk mengecek setelan apa saja yang sedang aktif di komputermu dan berasal dari file mana, jalankan:

```bash
git config --global <kunci> <nilai>
git config --global --list --show-origin
```

## Daftar setelan

Berikut daftar 16 setelan yang direkomendasikan beserta efeknya:

| Setelan | Nilai | Efeknya |
|---|---|---|
| `init.defaultBranch` | `main` | Jalur kerja awal (*branch*) saat bikin repo baru (`git init`) langsung bernama `main`. |
| `pull.rebase` | `true` | Saat `git pull`, Git otomatis menyusun ulang simpanan lokalmu di atas pembaruan terbaru (*rebase*), bukan membuat *commit* penggabungan tambahan. |
| `rebase.autoStash` | `true` | Menitipkan editan di meja kerja (*working tree*) ke laci sementara (*stash*) secara otomatis sebelum *rebase*, lalu mengembalikannya setelah selesai. |
| `rebase.autoSquash` | `true` | *Commit* bertanda `fixup!` dan `squash!` otomatis dirapikan ke posisinya saat melakukan `rebase -i`. |
| `rebase.updateRefs` | `true` | *Branch* yang saling bertumpuk (*stacked branches*) ikut digeser otomatis saat kamu melakukan *rebase*. |
| `push.autoSetupRemote` | `true` | Mengirim (*push*) *branch* baru ke server langsung tersambung otomatis tanpa perlu mengetik `-u origin <cabang>`. |
| `fetch.prune` | `true` | Membersihkan catatan `origin/*` di komputermu kalau *branch* tersebut sudah dihapus di server. |
| `rerere.enabled` | `true` | Mengingat cara kamu membereskan *merge conflict*, supaya kalau bentrokan yang sama muncul lagi, Git membereskannya otomatis. |
| `merge.conflictStyle` | `zdiff3` | Menampilkan versi kode asli (*base*) di tengah blok bentrokan agar kamu tahu perubahan asalnya dari mana. |
| `diff.algorithm` | `histogram` | Tampilan perbandingan kode (*diff*) lebih rapi saat ada fungsi atau blok kode yang dipindah posisi. |
| `diff.colorMoved` | `default` | Memberi warna berbeda untuk baris kode yang cuma pindah tempat vs baris yang benar-benar baru ditulis. |
| `branch.sort` | `-committerdate` | Daftar `git branch` diurutkan dari *branch* yang paling baru kamu kerjakan. |
| `tag.sort` | `version:refname` | Mengurutkan *tag* berdasarkan nomor versi yang benar (`v1.10` muncul setelah `v1.9`, bukan setelah `v1.1`). |
| `column.ui` | `auto` | Daftar `git branch`, `tag`, dan `status` disusun rapi per kolom mengikuti lebar terminalmu. |
| `commit.verbose` | `true` | Menampilkan rincian perubahan kode (*diff*) di bagian bawah editor saat kamu menulis pesan *commit*. |
| `help.autocorrect` | `prompt` | Kalau kamu salah ketik perintah Git, Git akan bertanya dulu sebelum menjalankan tebakannya. |

## Versi siap salin

Cara paling cepat, salin dan tempel blok di bawah ini ke dalam file `~/.gitconfig`:

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

Dari 16 setelan di atas, tiga setelan ini biasanya paling cepat terasa manfaatnya buat pemula:

### `rerere`

`rerere` (*reuse recorded resolution*) berfungsi seperti ingatan otomatis untuk membereskan bentrokan kode (*merge conflict*). Saat dua jalur kerja mengubah baris yang sama, Git akan merekam bagaimana cara kamu menyelesaikannya pertama kali. Kalau nanti kamu melakukan *rebase* pada *branch* panjang atau menggabungkan *branch* berulang kali dan bertemu bentrokan yang sama persis, Git langsung menerapkan solusi yang tadi sudah kamu pilih tanpa menyuruhmu mengedit manual lagi.

### `zdiff3`

Secara bawaan, saat terjadi *merge conflict*, Git hanya menunjukkan dua versi: kodemu sekarang (`HEAD` — penunjuk posisi kita saat ini) dan kode dari *branch* lawan. Masalahnya, kita sering lupa kode aslinya seperti apa sebelum kalian berdua mengeditnya.

Dengan `zdiff3`, Git menambahkan bagian tengah bertanda `|||||||` yang berisi kode asli sebelum diubah (*common ancestor*), dan mengeluarkan baris yang kembar di kedua sisi dari penanda konflik:

```text
  <<<<<<< HEAD
  const debounceMs = 250;
  ||||||| merged common ancestors
  const debounceMs = 150;
  =======
  const debounceMs = 400;
  >>>>>>> feature/search-bar
```

Begitu melihat aslinya adalah `150`, langsung jelas konteksnya: satu sisi menaikkan jeda *debounce* jadi `250`, dan sisi lain menaikkan jadi `400`. Menentukan mana yang harus dipakai jadi jauh lebih mudah.

### `push.autoSetupRemote`

Biasanya, setelah membuat *branch* baru lalu mengetik `git push`, Git menolak dan menyuruhmu mengulang dengan perintah panjang `git push --set-upstream origin nama-cabang` supaya jalur lokalmu tersambung dengan jalur di server (*remote*). Dengan menyalakan `push.autoSetupRemote = true`, kamu cukup mengetik `git push` sekali saja, dan Git otomatis membuat sekaligus menyambungkan *branch* tersebut di server.

> **Catatan versi:** Beberapa setelan di atas butuh Git versi cukup baru: `merge.conflictStyle = zdiff3` butuh Git 2.35 ke atas, `push.autoSetupRemote` butuh Git 2.37 ke atas, dan `rebase.updateRefs` butuh Git 2.38 ke atas. Kamu bisa mengecek versi Git di komputermu lewat perintah `git --version`.

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
