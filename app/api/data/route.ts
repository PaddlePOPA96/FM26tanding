import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

// --- tipe harus sama dengan di page.tsx ---
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

// --- default awal (boleh sama dengan default di page.tsx) ---
const defaultState: LeagueState = {
  managers: [
    {
      id: "m1",
      name: "HUI",
      clubName: "Manchester City",
      clubLogoFile: "Manchester City.png",
      photoFile: "hui.png",
      bio: ""
    },
    {
      id: "m2",
      name: "bobby",
      clubName: "Liverpool FC",
      clubLogoFile: "Liverpool FC.png",
      photoFile: "bobby.png",
      bio: ""
    },
    {
      id: "m3",
      name: "ALDO",
      clubName: "Chelsea FC",
      clubLogoFile: "Chelsea FC.png",
      photoFile: "aldo.png",
      bio: ""
    },
    {
      id: "m4",
      name: "OWEN",
      clubName: "Manchester United",
      clubLogoFile: "Manchester United.png",
      photoFile: "owen.png",
      bio: ""
    },
  ],
  matches: [],
  matchCounter: 1,
  activeManagerIds: ["m1", "m2", "m3", "m4"],
  timestamp: new Date().toISOString()
}

// disimpan di memory server
let memoryState: LeagueState = { ...defaultState }

// --- Pusher server (kalau env nya lengkap) ---
const pusher =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
    : null

// GET: dipakai halaman utama (loadState) & halaman detail
export async function GET(_req: NextRequest) {
  return NextResponse.json(memoryState)
}

// POST: dipanggil dari page.tsx -> saveState()
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LeagueState>

    // gabung state lama + baru, tapi pastikan field utama ada
    memoryState = {
      ...memoryState,
      ...body,
      managers: body.managers ?? memoryState.managers,
      matches: body.matches ?? memoryState.matches,
      matchCounter: body.matchCounter ?? memoryState.matchCounter,
      activeManagerIds: body.activeManagerIds ?? memoryState.activeManagerIds,
      timestamp: body.timestamp ?? new Date().toISOString(),
    }

    // broadcast ke semua client (kalau pusher dikonfig)
    if (pusher) {
      await pusher.trigger('fm24-league', 'data-updated', memoryState)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/data error', e)
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 500 })
  }
}
