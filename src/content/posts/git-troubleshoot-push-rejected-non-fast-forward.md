---
title: "Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)"
date: 2026-11-18T11:00:00+07:00
categories:
  - Git
tags:
  - git
  - github
  - troubleshooting
  - workflow
  - pemula
description: "Cara mengatasi error git push ditolak karena rejected (fetch first / non-fast-forward) atau The current branch has no upstream branch dengan aman tanpa merusak riwayat tim."
---

Salah satu error Git pertama yang paling sering membuat pemula kaget adalah ketika baru saja semangat menyelesaikan fitur lalu mengetik `git push`, tiba-tiba Git menolak dengan tulisan merah:

```text
! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:user/repo.git'
hint: Updates were rejected because the remote contains work that you do not have locally.
```

Atau error lain saat baru membuat branch di laptop:

```text
fatal: The current branch feat/login has no upstream branch.
```

Tenang—tidak ada file yang hilang! Di bagian pertama seri troubleshooting Git ini, kita bereskan kedua penolakan `git push` tersebut dengan cara yang aman.

---

## Kasus 1: `[rejected] ... (fetch first)` atau `(non-fast-forward)`

### Kenapa Git Menolak `git push`-mu?

Bayangkan kamu dan rekan tim (atau kamu sendiri dari laptop lain / langsung di web GitHub) sama-sama mengedit satu buku catatan:

1. Pagi hari, riwayat terakhir di GitHub adalah Commit **A**.
2. Rekan tim (atau editan langsung file `README.md` di browser GitHub) menambahkan Commit **B** ke GitHub.
3. Sementara itu di laptopmu, kamu tidak tahu ada Commit **B**, lalu kamu membuat Commit **C** di atas Commit **A**.

Saat kamu mencoba mendorong Commit **C**, Git menolak keras karena kalau dipaksa menimpa, **Commit B di GitHub bisa tertimpa dan hilang!**

### Cara Mengatasi yang Benar: Tarik Dulu, Baru Push (`git pull --rebase`)

Jangan langsung mencari `--force`! Ambil dulu Commit **B** dari GitHub lalu letakkan Commit **C** milikmu rapi di atasnya menggunakan **`--rebase`**:

```bash
git pull --rebase origin main
```

Apa yang terjadi?
- Jika tidak ada baris kode yang bentrok, Git otomatis menaruh Commit **C** di atas **B** tanpa membuat commit *"Merge branch 'main' of ..."* yang mengotori riwayat. Setelah itu tinggal:
  ```bash
  git push
  ```
- Jika ada baris yang sama-sama diubah antara Commit **B** dan **C**, Git berhenti sejenak dan memintamu memilih baris yang benar (*conflict*). Selesaikan konfliknya di editor, lalu lanjutkan dengan:
  ```bash
  git add .
  git rebase --continue
  git push
  ```
  *(Kalau panik di tengah konflik dan ingin membatalkan ke kondisi sebelum pull, cukup jalankan `git rebase --abort`! Baca juga panduan lengkap kami di [cara membaca dan menyelesaikan merge conflict](/posts/git-merge-conflict/).)*

---

## Kasus 2: `fatal: The current branch has no upstream branch`

Error ini muncul tiap kali kamu membuat branch baru di laptop (misal `git switch -c feat/pembayaran`), lalu mengetik `git push` saja tanpa nama remote & branch.

Git cuma bertanya: *"Branch lokal `feat/pembayaran` ini mau dikirim ke remote mana dan disambungkan ke nama branch apa di GitHub?"*

### Solusi Sekali Ketik (`-u`)

Tambahkan **`-u`** (`--set-upstream`) pada push pertama branch tersebut:

```bash
git push -u origin feat/pembayaran
```

Mulai push kedua dan seterusnya di branch yang sama, kamu cukup mengetik `git push` (atau `git pull`) saja tanpa menulis `origin feat/pembayaran` lagi!

**Trik otomatis di Git modern:** Kalau tidak ingin repot mengetik `-u` setiap kali membuat branch baru, aktifkan pengaturan ini satu kali di laptopmu:

```bash
git config --global push.autoSetupRemote true
```

Sejak itu, `git push` di branch baru otomatis langsung membuatkan dan menyambungkan branch pasangannya di `origin`! *(Lihat juga daftar setelan nyaman lainnya di [konfigurasi Git wajib pemula](/posts/git-config-wajib/).)*

---

## Jebakan Berbahaya: Jangan Asal Pakai `git push --force`!

Ketika melihat `[rejected]`, banyak pemula mencari jalan pintas di forum lalu menjalankan `git push --force`. **Hati-hati!**

- **`git push --force`** memaksa GitHub menimpa total riwayat di server dengan riwayat di laptopmu. Jika rekan tim baru saja push Commit **B** 10 detik sebelumnya, Commit **B** akan **lenyap dari branch tersebut**!
- **Kapan force push boleh dipakai?** **Hanya** di branch fitur pribadimu sendiri setelah kamu merapikan commit dengan [`git commit --amend`](/posts/git-commit-amend/) atau `rebase`—**JANGAN pernah** di branch bersama seperti `main`!
- Dan sekalipun di branch pribadi, **selalu gunakan `--force-with-lease`**, bukan `--force`:
  ```bash
  git push --force-with-lease
  ```
  Bedanya: `--force-with-lease` lebih cerdas—ia akan tetap **menolak push** jika ternyata di GitHub ada commit baru dari orang lain yang belum pernah kamu `fetch`! *(Untuk kebiasaan cek perubahan server sebelum menggabungkan kode, lihat juga [beda `git fetch` dan `git pull`](/posts/git-fetch-vs-pull/).)*

---

## Checklist Singkat Sebelum Lanjut

- [x] Jika `push` ditolak (`fetch first` / `non-fast-forward`), tarik dulu perubahan dengan `git pull --rebase` baru `push`.
- [x] Memakai `git push -u origin nama-branch` (atau mengaktifkan `push.autoSetupRemote true`) untuk branch baru.
- [x] Menghindari `--force` di branch bersama dan menggantinya dengan `--force-with-lease` hanya di branch pribadi.

Di **Bagian 2**, kita akan menenangkan kepanikan klasik lain saat membuka commit lama: **`You are in 'detached HEAD' state`**—termasuk cara menyelamatkan kode jika kamu telanjur membuat commit di dalamnya!

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. **Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)** *(sedang dibaca)*
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. [Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)](/posts/git-troubleshoot-auth-ssh-https-github/)
4. [Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa](/posts/git-troubleshoot-divergent-branches-pull/)
5. [Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur](/posts/git-troubleshoot-salah-branch-salah-commit/)
6. [Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor](/posts/git-troubleshoot-file-besar-rahasia-github/)
7. [Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership](/posts/git-troubleshoot-line-ending-case-filename/)

---

## Referensi

- [Git Official Docs: `git-push`](https://git-scm.com/docs/git-push)
- [Git Official Docs: `git-pull`](https://git-scm.com/docs/git-pull)
- [Git Official Docs: `git-config`](https://git-scm.com/docs/git-config)
