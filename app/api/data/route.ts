import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Pusher from 'pusher'

export const dynamic = 'force-dynamic'

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

const DATA_FILE = path.join(process.cwd(), 'league-data.json')

function defaultState(): LeagueState {
  const m = [
    { id: "m1", name: "HUI", clubName:"Manchester City", clubLogoFile:"Manchester City.png", photoFile:"hui.png", bio:"" },
    { id: "m2", name: "bobby", clubName:"Liverpool FC", clubLogoFile:"Liverpool FC.png", photoFile:"bobby.png", bio:"" },
    { id: "m3", name: "ALDO", clubName:"Chelsea FC", clubLogoFile:"Chelsea FC.png", photoFile:"aldo.png", bio:"" },
    { id: "m4", name: "OWEN", clubName:"Manchester United", clubLogoFile:"Manchester United.png", photoFile:"owen.png", bio:"" }
  ]
  return {
    managers: m,
    matches: [],
    matchCounter: 1,
    activeManagerIds: m.map(x => x.id),
    timestamp: new Date().toISOString()
  }
}

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
}

function readState(): LeagueState {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultState()
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return defaultState()
  }
}

export async function GET() {
  const data = readState()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const newState: LeagueState = {
      managers: body.managers || [],
      matches: body.matches || [],
      matchCounter: body.matchCounter || 1,
      activeManagerIds: body.activeManagerIds || [],
      timestamp: new Date().toISOString()
    }

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(newState, null, 2), 'utf8')
    } catch {}

    if (pusher) {
      await pusher.trigger("fm24-league", "data-updated", newState)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error("POST ERROR:", err)
    return NextResponse.json({ error: "Bad Request" }, { status: 500 })
  }
}
