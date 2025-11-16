import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Pusher from 'pusher'

// File JSON untuk dev lokal (di root project)
const DATA_FILE = path.join(process.cwd(), 'league-data.json')

// === Init Pusher server ===
let pusher: Pusher | null = null

if (
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET
) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
    useTLS: true,
  })
} else {
  console.warn('[PUSHER] Cred server belum lengkap, realtime nonaktif di server.')
}

// Helper: pastikan file & folder ada (buat dev lokal)
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// GET: kirim state terakhir (atau default)
export async function GET(_req: NextRequest) {
  try {
    ensureDataFile()

    if (!fs.existsSync(DATA_FILE)) {
      // default dari league-data.json di repo
      const defaultRaw = fs.readFileSync(DATA_FILE, 'utf-8')
      const defaultData = JSON.parse(defaultRaw)
      return NextResponse.json(defaultData)
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error GET /api/data:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

// POST: simpan state + broadcast ke semua browser via Pusher
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const dataToSave = {
      ...body,
      timestamp: new Date().toISOString(),
    }

    // TULIS FILE (jalan bagus di dev lokal; di Netlify sifatnya sementara)
    try {
      ensureDataFile()
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8')
    } catch (fsErr) {
      // Di Netlify bisa gagal / ephemeral — nggak apa, tetap lanjut Pusher
      console.warn('FS write error (mungkin di Netlify):', fsErr)
    }

    // Broadcast ke semua client yang subscribe di Pusher
    if (pusher) {
      try {
        await pusher.trigger('fm24-league', 'data-updated', dataToSave)
      } catch (pErr) {
        console.error('Pusher error:', pErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error POST /api/data:', error)
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
  }
}
