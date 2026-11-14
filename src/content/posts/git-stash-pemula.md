---
title: "Titip kodingan setengah jadi dengan git stash"
date: 2026-11-11T16:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Cara menyimpan pekerjaan yang belum siap di-commit ke laci sementara waktu harus pindah branch mendadak."
---

Bayangkan kamu sedang setengah jalan mengerjakan fitur baru—kodenya masih berantakan dan belum jalan. Tiba-tiba ada laporan *bug* darurat dan kamu harus segera pindah ke *branch* `main`.

Begitu mengetik `git switch main`, Git sering kali menolak karena berkas yang sedang kamu edit bisa tertimpa. Mau di-*commit* sekarang kodenya belum layak, mau dibuang sayang sekali.

Di situasi seperti inilah **`git stash`** jadi penyelamat. Bayangkan `git stash` seperti **laci meja sementara**: kamu memasukkan semua perubahan setengah jadimu ke dalam laci agar meja kerjamu kembali bersih dan bisa dipakai pindah *branch* dengan aman, lalu nanti tinggal diambil lagi saat kembali.

## 1. Selalu simpan dengan pesan yang jelas dan opsi `-u`

Banyak pemula hanya mengetik `git stash` polosan tanpa opsi apa pun. Kebiasaan itu menimbulkan dua masalah kecil yang sering bikin bingung:
1. Laci hanya diberi label umum seperti `WIP on nama-branch`, jadi kalau kamu punya tiga titipan di laci, kamu akan lupa isi masing-masing.
2. **Berkas baru yang belum pernah di-`git add`** (*untracked files*) tidak ikut masuk ke laci dan malah tetap tertinggal berceceran di folder kerja!

Karena itu, biasakan memakai format yang rapi ini:

```bash
git stash push -u -m "validasi form kupon belum kelar"
```

Arti opsinya:
- `-u` (`--include-untracked`): ikut memasukkan berkas baru yang belum pernah dilacak Git ke dalam laci.
- `-m "..."`: memberi label catatan agar kamu ingat pekerjaan apa yang ada di dalam tumpukan *stash* ini.

Begitu dijalankan, folder kerjamu langsung bersih kembali seperti *commit* terakhir, dan kamu bebas berpindah *branch*.

## 2. Melihat daftar titipan dan mengintip isinya

Untuk melihat semua pekerjaan yang sedang tersimpan di laci *stash*:

```bash
git stash list
```

Isinya diurutkan mulai dari yang paling baru masuk (bernomor `stash@{0}`):

```text
stash@{0}: On feat/checkout: validasi form kupon belum kelar
stash@{1}: On feat/login: coba ganti library session
```

Kalau lupa perubahan kode apa saja yang tersimpan di dalam `stash@{0}`, intip dulu perubahannya (*diff*) memakai `show -p` sebelum mengeluarkannya kembali:

```bash
git stash show -p stash@{0}
```

## 3. Mengambil kembali titipan dengan `pop` atau `apply`

Setelah urusan darurat di *branch* lain selesai dan kamu kembali ke *branch* awal, keluarkan lagi pekerjaanmu dari laci:

```bash
git stash pop
```

- **`git stash pop`**: mengambil tumpukan paling atas (`stash@{0}`), menerapkannya kembali ke folder kerjamu, lalu **otomatis menghapusnya** dari daftar *stash*. Kalau mau mengambil tumpukan urutan lain, sebutkan nomornya, misalnya `git stash pop stash@{1}`.
- **`git stash apply`**: menempelkan perubahan dari laci ke folder kerja, **tetapi tetap menyimpan salinannya** di dalam daftar *stash*. Pakai `apply` jika satu potongan perubahan yang sama ingin kamu tempelkan ke lebih dari satu *branch*.

## 4. Membersihkan tumpukan *stash* yang tidak terpakai lagi

Kalau satu titipan di laci ternyata sudah tidak jadi dipakai, hapus satu per satu dengan `drop`, atau kosongkan seluruh isi laci sekaligus dengan `clear`:

```bash
git stash drop stash@{1}   # menghapus satu tumpukan tertentu
git stash clear            # menghapus SEMUA stash (hati-hati: tidak bisa dibatalkan!)
```

**Tip praktis:** Usahakan jangan menimbun lebih dari dua atau tiga *stash* hingga berhari-hari sampai lupa konteksnya. Jika kamu sering harus membuka dua *branch* besar secara paralel dalam waktu lama, cara yang jauh lebih rapi adalah membuka folder kerja terpisah menggunakan `git worktree` daripada terus-terusan memakai *stash*.

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
