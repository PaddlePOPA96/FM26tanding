import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Pusher from 'pusher'

// Biar Next nggak cache response
export const dynamic = 'force-dynamic'

// ====== TIPE DATA (sama dengan di page.tsx) ======
interface Manager {
  id: string
  name: string
  clubName: string
  clubLogoFile: string
  photoFile: string
  bio: string
}

interface Match {
  id: number
  managerId: string
  opponentId?: string
  opponent?: string
  type: string
  date: string
  competition: string
  ha: string
  gf: number
  ga: number
  use: boolean
}

interface LeagueState {
  managers: Manager[]
  matches: Match[]
  matchCounter: number
  activeManagerIds: string[]
  timestamp?: string
}

// File JSON untuk dev lokal (di root project)
const DATA_FILE = path.join(process.cwd(), 'league-data.json')

// ====== DEFAULT STATE (kalau file belum ada) ======
function getDefaultState(): LeagueState {
  const defaultManagers: Manager[] = [
    {
      id: 'm1',
      name: 'HUI',
      clubName: 'Manchester City',
      clubLogoFile: 'Manchester City.png',
      photoFile: 'hui.png',
      bio: ''
    },
    {
      id: 'm2',
      name: 'bobby',
      clubName: 'Liverpool FC',
      clubLogoFile: 'Liverpool FC.png',
      photoFile: 'bobby.png',
      bio: ''
    },
    {
      id: 'm3',
      name: 'ALDO',
      clubName: 'Chelsea FC',
      clubLogoFile: 'Chelsea FC.png',
      photoFile: 'aldo.png',
      bio: ''
    },
    {
      id: 'm4',
      name: 'OWEN',
      clubName: 'Manchester United',
      clubLogoFile: 'Manchester United.png',
      photoFile: 'owen.png',
      bio: ''
    }
  ]

  return {
    managers: defaultManagers,
    matches: [],
    matchCounter: 1,
    activeManagerIds: defaultManagers.map(m => m.id),
    timestamp: new Date().toISOString()
  }
}

// ====== INIT PUSHER SERVER ======
let pusher: Pusher | null = null

if (
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  })
} else {
  console.warn('Pusher server TIDAK aktif – cek env PUSHER_APP_ID / KEY / SECRET / CLUSTER')
}

// ====== HELPER BACA FILE ======
function readFromDisk(): LeagueState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    if (!raw) return null
    const parsed = JSON.parse(raw)

    const state: LeagueState = {
      managers: Array.isArray(parsed.managers) ? parsed.managers : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      matchCounter:
        typeof parsed.matchCounter === 'number' ? parsed.matchCounter : 1,
      activeManagerIds: Array.isArray(parsed.activeManagerIds)
        ? parsed.activeManagerIds
        : Array.isArray(parsed.managers)
        ? parsed.managers.map((m: any) => m.id)
        : [],
      timestamp: parsed.timestamp || new Date().toISOString()
    }

    return state
  } catch (err) {
    console.error('Gagal baca league-data.json:', err)
    return null
  }
}

// ====== GET /api/data ======
export async function GET(_req: NextRequest) {
  try {
    const fromDisk = readFromDisk()
    if (fromDisk) {
      return NextResponse.json(fromDisk, { status: 200 })
    }

    // Kalau file belum ada → pakai default
    const defaultState = getDefaultState()
    return NextResponse.json(defaultState, { status: 200 })
  } catch (error) {
    console.error('Error GET /api/data:', error)
    const fallback = getDefaultState()
    return NextResponse.json(fallback, { status: 200 })
  }
}

// ====== POST /api/data ======
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const incoming: Partial<LeagueState> = body || {}

    const dataToSave: LeagueState = {
      managers: Array.isArray(incoming.managers) ? incoming.managers : [],
      matches: Array.isArray(incoming.matches) ? incoming.matches : [],
      matchCounter:
        typeof incoming.matchCounter === 'number' ? incoming.matchCounter : 1,
      activeManagerIds: Array.isArray(incoming.activeManagerIds)
        ? incoming.activeManagerIds
        : Array.isArray(incoming.managers)
        ? incoming.managers.map((m: any) => m.id)
        : [],
      timestamp: new Date().toISOString()
    }

    // Simpan ke file (lokal dev)
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8')
    } catch (fileErr) {
      console.error('Gagal menulis league-data.json:', fileErr)
      // Di serverless (Netlify) mungkin gagal, tapi tidak apa2 buat sekadar sync real-time
    }

    // Broadcast ke semua client via Pusher
    if (pusher) {
      try {
        await pusher.trigger('fm24-league', 'data-updated', dataToSave)
      } catch (pErr) {
        console.error('Pusher error:', pErr)
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Error POST /api/data:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
}
