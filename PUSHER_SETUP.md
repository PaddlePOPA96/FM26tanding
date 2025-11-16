# Setup Pusher untuk Real-time Data Sync

## Langkah-langkah Setup

### 1. Buat Akun Pusher

1. Kunjungi [https://dashboard.pusher.com/](https://dashboard.pusher.com/)
2. Buat akun gratis (free tier cukup untuk development)
3. Buat Channels app baru
4. Pilih cluster terdekat (misalnya: ap1 untuk Asia Pacific)

### 2. Dapatkan Credentials

Setelah membuat app, Anda akan mendapatkan:
- **App ID**
- **Key** (NEXT_PUBLIC_PUSHER_KEY)
- **Secret** (PUSHER_SECRET)
- **Cluster** (NEXT_PUBLIC_PUSHER_CLUSTER)

### 3. Setup Environment Variables

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key_here
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
PUSHER_APP_ID=your_app_id_here
PUSHER_SECRET=your_secret_here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Setup di Netlify

1. Di Netlify dashboard, masuk ke **Site settings** > **Environment variables**
2. Tambahkan semua environment variables:
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`

### 6. Test

1. Jalankan `npm run dev`
2. Buka aplikasi di 2 browser berbeda
3. Buat perubahan di browser 1
4. Browser 2 akan otomatis update secara real-time!

## Cara Kerja

1. **Save Data**: Ketika user membuat perubahan, data disimpan ke server dan dikirim ke Pusher
2. **Real-time Sync**: Semua client yang terhubung akan menerima update via Pusher
3. **Auto Update**: UI otomatis update tanpa perlu refresh

## Free Tier Limits

Pusher free tier memberikan:
- 200,000 messages/day
- 100 concurrent connections
- Unlimited channels

Cukup untuk aplikasi kecil hingga menengah!

