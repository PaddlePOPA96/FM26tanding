# FM24 Manager League

Aplikasi Next.js untuk mengelola liga manager Football Manager style dengan data shared untuk semua user.

## Fitur

- **Manager Cards**: Tampilkan 4 manager dengan foto besar dan nama yang jelas
- **Match System**: Input pertandingan dengan memilih manager dan lawan (AI atau Teman)
- **Standings**: Klasemen otomatis berdasarkan match yang dicentang
- **Manager Detail**: Detail statistik per manager
- **Edit Manager**: Halaman khusus untuk edit club dan biodata manager
- **Dark/Light Theme**: Toggle tema gelap/terang
- **Shared Data**: Data sama untuk semua user (disimpan di server)
- **Auto-save**: Data tersimpan otomatis setiap perubahan

## Instalasi

```bash
npm install
```

## Menjalankan Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Deploy ke Netlify

### ⚠️ PENTING: Data Shared untuk Semua User dengan Real-time Sync

Aplikasi ini menggunakan **Pusher** untuk real-time data sync - semua user melihat data yang sama dan update secara real-time!

### Setup Pusher

**Lihat file `PUSHER_SETUP.md` untuk panduan lengkap setup Pusher.**

Quick setup:
1. Buat akun di [pusher.com](https://dashboard.pusher.com/)
2. Buat Channels app
3. Dapatkan credentials (App ID, Key, Secret, Cluster)
4. Buat file `.env.local` dengan credentials
5. Deploy ke Netlify dengan environment variables yang sama

### Environment Variables

Buat file `.env.local`:
```env
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
```

Tambahkan environment variables yang sama di Netlify dashboard.

### Deploy Steps

1. Push code ke GitHub
2. Connect repository ke Netlify
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Deploy!

## Struktur Folder

- `app/` - Next.js app directory
- `app/api/data/` - API routes untuk save/load data
- `data/` - Folder untuk menyimpan data JSON (development only)
- `public/foto/` - Foto manager
- `public/logo/` - Logo klub

## Perubahan dari Versi HTML

1. ✅ Dikonversi ke Next.js dengan React
2. ✅ Setup Manager section dihapus
3. ✅ Match form sekarang memilih manager dan lawan (auto-detect AI/Teman)
4. ✅ Foto manager diperbesar (120x120px)
5. ✅ Nama manager ditampilkan lebih besar dan jelas
6. ✅ Halaman edit manager terpisah (ganti club + biodata)
7. ✅ **Data shared untuk semua user** (disimpan di server)

## Data Storage

- **Development**: File system (`/data/league-data.json`)
- **Production**: Perlu database (Supabase, MongoDB, atau Fauna)
- **Backup**: localStorage sebagai fallback

## Reset Data

Klik tombol "🔄 Reset" di header untuk mereset semua data ke default. **Peringatan**: Ini akan mereset data untuk semua user!

## Catatan Penting

- Data disimpan di server, jadi semua user melihat data yang sama
- Perubahan oleh satu user akan terlihat oleh semua user
- Untuk production di Netlify, **WAJIB** menggunakan database (file system tidak persistent)
