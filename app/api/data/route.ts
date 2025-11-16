import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Pusher from 'pusher'

const DATA_FILE = path.join(process.cwd(), 'data', 'league-data.json')

// --- Init Pusher server (hanya kalau kredensial lengkap) ---
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
  console.warn(
    '[PUSHER] Server credentials belum lengkap. Realtime akan nonaktif di server.'
  )
}

// --- Helper: pastikan folder data ada ---
function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// --- GET: ambil data liga ---
export async function GET(_req: NextRequest) {
  try {
    ensureDataDir()

    if (!fs.existsSync(DATA_FILE)) {
      // Default data pertama kali (boleh kamu sesuaikan)
      const defaultData = {
        managers: [
          {
            id: 'm1',
            name: 'HUI',
            clubName: 'Manchester City',
            clubLogoFile: 'Manchester City.png',
            photoFile: 'hui.png',
            bio: '',
          },
          {
            id: 'm2',
            name: 'bobby',
            clubName: 'Liverpool FC',
            clubLogoFile: 'Liverpool FC.png',
            photoFile: 'bobby.png',
            bio: '',
          },
          {
            id: 'm3',
            name: 'ALDO',
            clubName: 'Chelsea FC',
            clubLogoFile: 'Chelsea FC.png',
            photoFile: 'aldo.png',
            bio: '',
          },
          {
            id: 'm4',
            name: 'OWEN',
            clubName: 'Manchester United',
            clubLogoFile: 'Manchester United.png',
            photoFile: 'owen.png',
            bio: '',
          },
        ],
        matches: [],
        matchCounter: 1,
        timestamp: new Date().toISOString(),
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8')
      return NextResponse.json(defaultData)
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error reading data:', error)
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    )
  }
}

// --- POST: simpan data liga + broadcast ke Pusher ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Optional: validasi basic
    // if (!Array.isArray(body.managers) || !Array.isArray(body.matches)) { ... }

    ensureDataDir()
    const dataToSave = {
      ...body,
      timestamp: new Date().toISOString(),
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8')

    // Broadcast ke semua client via Pusher
    if (pusher) {
      try {
        await pusher.trigger('fm24-league', 'data-updated', dataToSave)
      } catch (pusherError) {
        console.error('Pusher error:', pusherError)
        // lanjut aja walau realtime gagal
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data saved successfully',
    })
  } catch (error) {
    console.error('Error saving data:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
}
