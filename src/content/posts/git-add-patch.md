---
title: "Commit sebagian perubahan dengan git add -p"
date: 2026-11-11T10:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "workflow"]
description: "Memecah editan yang tercampur di satu berkas jadi beberapa commit kecil yang rapi pakai mode patch."
---

Lagi benerin satu *bug*, tangan sering gatel ikut merapikan komponen di sebelahnya atau nyelipin `console.log` buat *debug* di berkas yang sama. Waktu mau *commit*, kalau langsung `git add .` semuanya malah kecampur jadi satu. Pakai `git add -p` (mode *patch*), kamu bisa pilih potongan perubahan (*hunk*) mana saja yang mau dimasukkan sekarang dan mana yang ditinggal buat *commit* berikutnya.

## Cara pakainya

Jalankan buat seluruh repo, atau sebut nama berkasnya langsung:

```bash
git add -p
git add -p src/components/CheckoutForm.tsx
```

Git bakal menyodorkan perubahan per potongan lalu nunggu kamu memilih:

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

## Tombol di mode patch

| Tombol | Artinya |
|---|---|
| `y` | Masukkan potongan (*hunk*) ini ke *staging*. |
| `n` | Lewati potongan ini, biarkan tetap di *working tree*. |
| `q` | Berhenti sekarang; potongan yang tadi sudah dipilih `y` tetap aman di *staging*. |
| `a` | Masukkan potongan ini plus semua potongan sisanya di berkas yang sama. |
| `d` | Lewati potongan ini dan sisa potongan di berkas yang sama. |
| `s` | Pecah (*split*) potongan ini jadi bagian lebih kecil kalau ada baris pemisah di tengahnya. |
| `e` | Buka potongan ini di editor buat dipotong manual per baris. |
| `?` | Tampilkan contekan arti tiap huruf. |

## Motong baris manual pakai `e`

Kadang dua perubahan nempel persis atas-bawah tanpa jeda baris, jadi tombol `s` nggak sanggup membelahnya. Tekan `e`, nanti Git membuka potongan itu di teks editor. Aturan ngeditnya cuma tiga:

- Kalau ada **baris tambahan (`+`) yang belum mau ikut di-*commit***, hapus saja satu baris `+` itu.
- Kalau ada **baris hapus (`-`) yang belum mau ikut dihapus**, ganti tanda `-` di kolom pertama jadi spasi (` `) supaya dianggap baris biasa.
- Baris lain yang sudah diawali spasi dan angka di kepala `@@` jangan diutak-atik; Git bakal ngitung ulang ukurannya otomatis waktu berkas disimpan.

## Cek dulu sebelum commit

Sehabis milih-milih potongan, intip dulu apa yang beneran sudah masuk ke *staging* dan apa yang masih ketinggalan:

```bash
git diff --staged   # yang siap masuk ke commit sekarang
git diff            # sisa editan yang belum di-stage
```

## Perintah lain yang juga punya `-p`

Bukan cuma `git add` yang punya mode *patch*. Empat perintah ini sama bergunanya:

- `git restore -p`: buang sebagian editan (misalnya sisa kode *debug*) dari *working tree*. Hati-hati, potongan yang kamu iyakan langsung hilang.
- `git restore --staged -p`: keluarkan sebagian potongan yang tadi telanjur masuk ke *staging*.
- `git stash push -p`: simpan potongan tertentu saja ke dalam *stash*.
- `git commit -p`: pilih potongan lalu langsung buka editor pesan *commit* tanpa mampir ke `git add` dulu.

## Tip tambahan

Kalau capek harus menekan `Enter` tiap habis pencet `y` atau `n`, nyalakan mode satu tombol:

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
