import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Pusher from 'pusher'

const DATA_FILE = path.join(process.cwd(), 'data', 'league-data.json')

// Initialize Pusher (only if credentials are available)
let pusher: Pusher | null = null

if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    useTLS: true
  })
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// GET - Load data
export async function GET() {
  try {
    ensureDataDir()
    
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8')
      const data = JSON.parse(fileContent)
      return NextResponse.json(data)
    } else {
      // Return default data if file doesn't exist
      return NextResponse.json({
        managers: [],
        matches: [],
        matchCounter: 1
      })
    }
  } catch (error) {
    console.error('Error reading data:', error)
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    )
  }
}

// POST - Save data
export async function POST(request: NextRequest) {
  try {
    ensureDataDir()
    
    const body = await request.json()
    const { managers, matches, matchCounter } = body
    
    const data = {
      managers: managers || [],
      matches: matches || [],
      matchCounter: matchCounter || 1,
      timestamp: new Date().toISOString()
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    
    // Broadcast update to all clients via Pusher
    if (pusher) {
      try {
        await pusher.trigger('fm24-league', 'data-updated', data)
      } catch (pusherError) {
        console.error('Pusher error:', pusherError)
        // Continue even if Pusher fails
      }
    }
    
    return NextResponse.json({ success: true, message: 'Data saved successfully' })
  } catch (error) {
    console.error('Error saving data:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
}
