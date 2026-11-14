---
title: "Commit sebagian perubahan dengan git add -p"
date: 2026-11-11T10:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "workflow"]
description: "Memecah editan yang tercampur di satu berkas jadi beberapa commit kecil yang rapi pakai mode patch."
---

Pernah mengalami situasi begini: niatnya cuma memperbaiki satu *bug* kecil di sebuah berkas, tetapi sekalian merapikan kode di baris lain dan menaruh beberapa `console.log` untuk pengecekan?

Saat waktunya *commit*, kalau langsung mengetik `git add .`, semua perubahan tadi tercampur jadi satu *commit* besar yang berantakan. Padahal, cara terbaik menggunakan Git adalah memisahkan satu *commit* untuk satu tujuan yang jelas.

Solusinya adalah **`git add -p`** (mode *patch*). Dengan `-p`, Git membagi perubahan di dalam sebuah berkas menjadi potongan-potongan kecil (disebut *hunk*), lalu menanyaimu satu per satu: potongan mana yang ingin dimasukkan ke keranjang siap *commit* (*staging area*) sekarang, dan mana yang mau ditinggal di folder kerja (*working tree*) untuk *commit* berikutnya.

## 1. Cara menjalankan mode *patch*

Kamu bisa menjalankannya untuk seluruh proyek, atau langsung menunjuk satu berkas spesifik:

```bash
git add -p
git add -p src/components/CheckoutForm.tsx
```

Git akan menampilkan satu potongan perubahan (*diff*) di layar, lalu berhenti di bagian bawah dan menunggu jawabanmu:

```text
diff --git a/src/components/CheckoutForm.tsx b/src/components/CheckoutForm.tsx
index 4b92e11..90c42a8 100644
--- a/src/components/CheckoutForm.tsx
+++ b/src/components/CheckoutForm.tsx
@@ -42,6 +42,7 @@ export function CheckoutForm({ onSubmit }: Props) {
 	return (
 		<button
 			type="submit"
+			disabled={isSubmitting}
 			className="btn-primary"
 		>
 	);
 }
(1/3) Stage this hunk [y,n,q,a,d,s,e,?]?
```

Cara membaca tampilannya:
- `(1/3)` artinya ini potongan ke-1 dari total 3 potongan perubahan yang ada di berkas itu.
- Baris diawali `+` berwarna hijau adalah baris baru yang kamu tambahkan.
- Baris diawali `-` berwarna merah adalah baris lama yang kamu hapus.

## 2. Arti huruf pilihan di mode *patch*

Di pertanyaan `[y,n,q,a,d,s,e,?]?`, ketik salah satu huruf berikut lalu tekan Enter:

| Tombol | Artinya |
|---|---|
| `y` (*yes*) | **Masukkan** potongan ini ke *staging area* (ikut di-*commit* sekarang). |
| `n` (*no*) | **Lewati** potongan ini, biarkan tetap di folder kerja untuk nanti. |
| `q` (*quit*) | **Berhenti sekarang**; potongan yang tadi sudah dipilih `y` tetap aman di *staging*. |
| `a` (*all*) | Masukkan potongan ini **plus semua potongan sisanya** di berkas yang sama. |
| `d` (*done/skip*) | Lewati potongan ini **dan semua potongan sisanya** di berkas yang sama. |
| `s` (*split*) | **Pecah** potongan ini menjadi bagian-bagian lebih kecil jika ada baris kosong/pemisah di tengahnya. |
| `e` (*edit*) | Buka potongan ini di editor teks untuk **dipotong manual per baris**. |
| `?` | Tampilkan contekan arti setiap huruf langsung di terminal. |

## 3. Memotong baris secara manual memakai `e`

Terkadang ada dua baris perubahan yang letaknya berdempetan persis atas-bawah tanpa jeda baris di antaranya, sehingga tombol `s` (*split*) tidak bisa membelahnya. Di saat seperti itu, ketik `e`, maka Git akan membuka potongan tersebut di editor teksmu.

Kamu cukup mengikuti tiga aturan sederhana saat mengeditnya:
- Jika ada **baris tambahan (`+`) yang belum mau ikut di-*commit*** sekarang: **hapus saja** seluruh baris `+` tersebut dari editor.
- Jika ada **baris hapus (`-`) yang belum mau ikut dihapus** di *commit* ini: ubah tanda `-` di kolom paling kiri menjadi **spasi** (` `), supaya dianggap baris biasa yang tidak berubah.
- Jangan mengutak-atik baris lain yang diawali spasi ataupun baris kepala yang bertanda `@@ ... @@`; Git akan menghitung ulang barisnya secara otomatis saat berkas disimpan dan ditutup.

## 4. Periksa ulang sebelum `git commit`

Setelah selesai memilih-milih potongan, biasakan mengecek kembali isi keranjang *staging* dengan dua perintah ini sebelum mengetik `git commit`:

```bash
git diff --staged   # melihat perubahan yang SUDAH siap masuk commit sekarang
git diff            # melihat sisa perubahan yang BELUM di-stage
```

Dengan begitu, kamu yakin 100% tidak ada `console.log` atau kode eksperimen yang terbawa masuk ke *commit*.

## 5. Perintah Git lain yang juga punya opsi `-p`

Bukan hanya `git add`, empat perintah lain ini juga mendukung mode *patch* untuk memilih perubahan per potongan:

- `git restore -p`: membuang sebagian perubahan saja (misalnya menghapus hanya baris `console.log` sisa *debugging*) dari folder kerjamu. **Hati-hati:** potongan yang kamu setujui dengan `y` di perintah ini langsung hilang permanen!
- `git restore --staged -p`: mengeluarkan sebagian potongan yang tadi telanjur masuk ke *staging area*.
- `git stash push -p`: menitipkan potongan tertentu saja ke laci sementara (*stash*), sementara potongan lainnya tetap kamu kerjakan.
- `git commit -p`: memilih potongan lalu langsung membuka editor pesan *commit* tanpa perlu mengetik `git add` terlebih dahulu.

## Tip tambahan biar lebih cepat

Jika merasa pegal harus selalu menekan `Enter` setiap kali mengetik `y` atau `n`, nyalakan mode satu tombol (*single key*) di konfigurasi global:

```bash
git config --global interactive.singleKey true
```

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. **Commit sebagian perubahan dengan git add -p**
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
