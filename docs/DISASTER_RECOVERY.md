# 🛡️ PANDUAN RECOVERY & FAIL-SAFE DISASTER RECOVERY
### JP Karaoke & LuckyCat Attendance System

Dokumen ini adalah panduan resmi prosedur operasional darurat (*Disaster Recovery & Fail-Safe*) jika terjadi gangguan server, kerusakan database, kegagalan update Vercel, atau pemadaman jaringan internet di outlet.

---

## 1. Satu-Klik Rollback Vercel (Instant Rollback)
Jika update kode baru di Vercel mengalami kendala (*breaking bug* atau *syntax error*), sistem dapat di-rollback seketika ke deployment stabil terakhir tanpa perlu menunggu build ulang:

### Cara 1: Menggunakan Vercel CLI (Hanya 5 Detik)
Jalankan perintah ini di terminal:
```bash
npx vercel rollback https://absensi-jplc.vercel.app
```
Atau alihkan alias domain langsung ke ID deployment stabil sebelumnya:
```bash
npx vercel alias set <DEPLOYMENT_URL_SEBELUMNYA> absensi-jplc.vercel.app
```

### Cara 2: Melalui Dashboard Vercel Web
1. Buka [https://vercel.com/ryan-gerrit/absensi-jplc](https://vercel.com/ryan-gerrit/absensi-jplc).
2. Masuk ke tab **Deployments**.
3. Cari deployment sebelumnya yang berstatus **Ready (Centang Hijau)**.
4. Klik tombol **`...` (Tiga Titik)** di sebelah kanan $\rightarrow$ Pilih **"Promote to Production"** atau **"Rollback"**.
5. Domain `absensi-jplc.vercel.app` akan langsung aktif kembali ke versi tersebut dalam 2 detik.

---

## 2. Pemulihan Database dari Snapshot (Point-in-Time Recovery)

Sistem telah dilengkapi dengan mesin pencadangan otomatis dengan retensi 30 hari.

### Cara 1: Menggunakan Tombol "Recover" di Dashboard Manager
1. Masuk ke Dashboard Manager menggunakan PIN Admin (`8980`).
2. Klik tombol **`🛡️ Recovery & Fault Switch`** di header dashboard.
3. Di tab **"Recover Button & Backup"**, akan tampil daftar seluruh snapshot harian yang pernah dibuat.
4. Pilih snapshot tanggal/jam sebelum insiden terjadi, lalu klik tombol hijau **`Pulihkan (Recover)`**.
5. Konfirmasi dialog $\rightarrow$ Sistem akan mengembalikan seluruh data tabel (`staff`, `attendance_logs`, `app_settings`) secara aman.

### Cara 2: Membuat Snapshot Cadangan Manual Sebelum Update Besar
Sebelum melakukan perubahan data massal (misal awal bulan atau pergantian tahun):
1. Buka modal **`Recovery & Fault Switch`** $\rightarrow$ Klik **`Buat Backup Snapshot Sekarang`**.
2. Snapshot baru akan dibuat dan tersimpan permanen di cloud storage Supabase serta backup lokal.

---

## 3. Saklar Darurat Hardware & Kamera (Fault Switch / Emergency Bypass)

Jika ada staf yang HP-nya pecah, kamera mati, atau GPS rusak permanen di lapangan:
1. Manager membuka panel **`Recovery & Fault Switch`** $\rightarrow$ Pilih tab **`Fault Switch & Bypass`**.
2. Masukkan ID / Nama staf yang bertugas.
3. Pilih jenis tindakan (*Check-In Masuk* atau *Check-Out Pulang*).
4. Tulis alasan darurat (misal: *"Kamera HP staf pecah/error"*).
5. Klik **`Jalankan Otorisasi Manual Darurat`**.
6. Sistem akan langsung mencatat kehadiran resmi staf tersebut dengan audit trail berflag khusus **`FLAG_MANUAL_ADMIN_OVERRIDE`** sehingga gaji tetap terhitung dan manajer lain tahu alasan bypass tersebut.

---

## 4. Keandalan Offline (IndexedDB Offline Queue)

Jika koneksi Wi-Fi atau internet provider outlet (Indihome/Biznet/Telkomsel) putus total saat operasional:
1. **Staf tetap bisa mengambil foto selfie dan absensi seperti biasa.**
2. Sistem mendeteksi kondisi offline secara otomatis:
   * Foto selfie dan titik koordinat GPS akan disimpan aman di memori lokal **IndexedDB** browser HP.
   * Muncul pesan: *"⚠️ Anda Sedang Offline. Absensi telah diamankan di memori HP dan otomatis terkirim begitu internet pulih!"*
3. Begitu router internet outlet menyala kembali, Service Worker secara otomatis mengirimkan (*auto-sync*) antrean absensi tersebut ke server tanpa staf perlu mengulang absensi dari awal.
