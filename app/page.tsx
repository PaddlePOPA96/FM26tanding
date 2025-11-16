'use client'

import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

const CLUB_LOGOS = [
  "AFC Bournemouth.png",
  "Arsenal FC.png",
  "Aston Villa.png",
  "Brentford FC.png",
  "Brighton & Hove Albion.png",
  "Burnley FC.png",
  "Chelsea FC.png",
  "Crystal Palace.png",
  "Everton FC.png",
  "Fulham FC.png",
  "Leeds United.png",
  "Liverpool FC.png",
  "Manchester City.png",
  "Manchester United.png",
  "Newcastle United.png",
  "Nottingham Forest.png",
  "Sunderland AFC.png",
  "Tottenham Hotspur.png",
  "West Ham United.png",
  "Wolverhampton Wanderers.png"
]

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

const STORAGE_KEY = "fm24_league_state_v1"

type Step = 'select' | 'league'

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [managers, setManagers] = useState<Manager[]>([
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
    }
  ])
  // Manager yang IKUT liga
  const [activeManagerIds, setActiveManagerIds] = useState<string[]>(() => ["m1", "m2", "m3", "m4"])
  // Step halaman: pilih peserta / dashboard liga
  const [step, setStep] = useState<Step>('select')

  const [matches, setMatches] = useState<Match[]>([])
  const [matchCounter, setMatchCounter] = useState(1)
  const [currentDetailManagerId, setCurrentDetailManagerId] = useState<string | null>(null)
  const [currentEditManagerId, setCurrentEditManagerId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [filterComp, setFilterComp] = useState('all')
  const [filterManager, setFilterManager] = useState('all')

  // Match form state
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [matchManager, setMatchManager] = useState('')
  const [matchType, setMatchType] = useState('AI')
  const [matchOpponent, setMatchOpponent] = useState('') // AI: club name, Teman: manager id
  const [matchDate, setMatchDate] = useState('')
  const [matchCompetition, setMatchCompetition] = useState('Liga')
  const [matchHa, setMatchHa] = useState('H')
  const [matchGf, setMatchGf] = useState(0)
  const [matchGa, setMatchGa] = useState(0)

  // Edit manager form state
  const [editClub, setEditClub] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  const pusherRef = useRef<Pusher | null>(null)
  const channelRef = useRef<any>(null)

  // Flag untuk menandai update yang datang dari server (loadState atau Pusher)
  const isRemoteUpdate = useRef(false)

  // Helper: managers yang ikut liga
  const activeManagers = managers.filter(m => activeManagerIds.includes(m.id))

  useEffect(() => {
    const savedTheme = localStorage.getItem("fmTheme") as 'dark' | 'light' | null
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
      document.body.setAttribute("data-theme", savedTheme)
    } else {
      document.body.setAttribute("data-theme", "dark")
    }

    const init = async () => {
      await loadState()
      setIsLoaded(true)

      // Kalau sudah ada match tersimpan, otomatis langsung ke halaman liga
      setStep((prev) => {
        if (matches.length > 0) return 'league'
        return prev
      })

      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PUSHER_KEY) {
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
        })
        pusherRef.current = pusher

        const channel = pusher.subscribe('fm24-league')
        channelRef.current = channel

        channel.bind('data-updated', (data: any) => {
          isRemoteUpdate.current = true

          if (data.managers && Array.isArray(data.managers)) {
            const managersWithBio = data.managers.map((m: Manager) => ({
              ...m,
              bio: m.bio || ''
            }))
            setManagers(managersWithBio)
          }
          if (Array.isArray(data.matches)) {
            setMatches(data.matches)
            if (data.matches.length > 0) {
              const maxId = Math.max(...data.matches.map((m: Match) => m.id || 0))
              setMatchCounter(maxId > 0 ? maxId + 1 : 1)
            }
          }
          if (data.matchCounter && typeof data.matchCounter === 'number') {
            setMatchCounter(data.matchCounter)
          }
          if (Array.isArray(data.activeManagerIds) && data.activeManagerIds.length > 0) {
            setActiveManagerIds(data.activeManagerIds)
          } else if (data.managers && Array.isArray(data.managers)) {
            setActiveManagerIds(data.managers.map((m: Manager) => m.id))
          }
        })
      }
    }

    init()

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all()
        channelRef.current.unsubscribe()
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    document.body.setAttribute("data-theme", theme)
    localStorage.setItem("fmTheme", theme)
  }, [theme])

  function getManagerById(id: string): Manager | null {
    const found = managers.find((m) => m.id === id)
    return found ?? null
  }

  async function saveState() {
    try {
      const state = { 
        managers, 
        matches,
        matchCounter,
        activeManagerIds,
        timestamp: new Date().toISOString()
      }
      
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save to server')
      }
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error("saveState error", e)
      try {
        const state = { managers, matches, matchCounter, activeManagerIds }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (localError) {
        console.error("localStorage save error", localError)
      }
    }
  }

  async function loadState() {
    try {
      isRemoteUpdate.current = true

      const response = await fetch('/api/data')
      
      if (response.ok) {
        const state = await response.json()
        
        if (state.managers && Array.isArray(state.managers)) {
          const managersWithBio = state.managers.map((m: Manager) => ({
            ...m,
            bio: m.bio || ''
          }))
          setManagers(managersWithBio)
        }
        
        if (Array.isArray(state.matches)) {
          setMatches(state.matches)
          if (state.matches.length > 0) {
            const maxId = Math.max(...state.matches.map((m: Match) => m.id || 0))
            setMatchCounter(maxId > 0 ? maxId + 1 : 1)
          } else {
            setMatchCounter(1)
          }
        }
        
        if (state.matchCounter && typeof state.matchCounter === 'number') {
          setMatchCounter(state.matchCounter)
        }

        if (Array.isArray(state.activeManagerIds) && state.activeManagerIds.length > 0) {
          setActiveManagerIds(state.activeManagerIds)
        } else if (state.managers && Array.isArray(state.managers)) {
          setActiveManagerIds(state.managers.map((m: Manager) => m.id))
        }

        // Kalau ada match di server, langsung ke halaman liga
        if (state.matches && Array.isArray(state.matches) && state.matches.length > 0) {
          setStep('league')
        }

        return
      }
    } catch (e) {
      console.error("loadState from server error", e)
    }
    
    try {
      isRemoteUpdate.current = true

      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      
      const state = JSON.parse(raw)
      
      if (state.managers && Array.isArray(state.managers)) {
        const managersWithBio = state.managers.map((m: Manager) => ({
          ...m,
          bio: m.bio || ''
        }))
        setManagers(managersWithBio)
      }
      
      if (Array.isArray(state.matches)) {
        setMatches(state.matches)
        if (state.matches.length > 0) {
          const maxId = Math.max(...state.matches.map((m: Match) => m.id || 0))
          setMatchCounter(maxId > 0 ? maxId + 1 : 1)
        } else {
          setMatchCounter(1)
        }
      }
      
      if (state.matchCounter && typeof state.matchCounter === 'number') {
        setMatchCounter(state.matchCounter)
      }

      if (Array.isArray(state.activeManagerIds) && state.activeManagerIds.length > 0) {
        setActiveManagerIds(state.activeManagerIds)
      } else if (state.managers && Array.isArray(state.managers)) {
        setActiveManagerIds(state.managers.map((m: Manager) => m.id))
      }

      if (state.matches && Array.isArray(state.matches) && state.matches.length > 0) {
        setStep('league')
      }
    } catch (e) {
      console.error("loadState from localStorage error", e)
    }
  }

  function computeResult(gf: number, ga: number) {
    if (gf > ga) return "W"
    if (gf < ga) return "L"
    return "D"
  }

  function computePoints(match: Match) {
    const result = computeResult(match.gf, match.ga)
    let pts = 0
    if (result === "W") {
      pts = match.type === "Teman" ? 5 : 3
    } else if (result === "D") {
      pts = match.type === "Teman" ? 2 : 1
    } else {
      pts = 0
    }
    return pts
  }

  function getManagerByClub(clubName: string): Manager | null {
    const found = managers.find(
      m => m.clubName === clubName || m.clubLogoFile === `${clubName}.png`
    )
    return found ?? null
  }
  

  function handleAddMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!matchManager || !matchOpponent) {
      alert('Pilih manager dan lawan!')
      return
    }

    let finalType = matchType
    let finalOpponentId: string | undefined = undefined
    let finalOpponent: string | undefined = undefined

    if (matchType === 'AI') {
      const opponentManager = getManagerByClub(matchOpponent)
      if (opponentManager && opponentManager.id !== matchManager) {
        finalType = 'Teman'
        finalOpponentId = opponentManager.id
      } else {
        finalType = 'AI'
        finalOpponent = matchOpponent
      }
    } else {
      finalType = 'Teman'
      finalOpponentId = matchOpponent
    }

    const match: Match = {
      id: matchCounter,
      managerId: matchManager,
      opponentId: finalOpponentId,
      opponent: finalOpponent,
      type: finalType,
      date: matchDate,
      competition: matchCompetition,
      ha: matchHa,
      gf: matchGf,
      ga: matchGa,
      use: true
    }

    setMatches([...matches, match])
    setMatchCounter(matchCounter + 1)
    
    setMatchOpponent('')
    setMatchGf(0)
    setMatchGa(0)
    setMatchDate('')
    setMatchType('AI')
    setMatchHa('H')
    setMatchCompetition('Liga')
  }

  function selectManagerForMatch(managerId: string) {
    if (!activeManagerIds.includes(managerId)) return
    setMatchManager(managerId)
    setShowMatchForm(true)
    setMatchOpponent('')
    setMatchGf(0)
    setMatchGa(0)
    setMatchDate('')
    setMatchType('AI')
    setMatchHa('H')
    setMatchCompetition('Liga')
    setTimeout(() => {
      document.getElementById('match-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function cancelMatchForm() {
    setShowMatchForm(false)
    setMatchManager('')
    setMatchOpponent('')
    setMatchGf(0)
    setMatchGa(0)
    setMatchDate('')
  }

  function updateManagerClub(managerId: string, clubLogoFile: string) {
    setManagers(managers.map(m => {
      if (m.id === managerId) {
        return {
          ...m,
          clubLogoFile: clubLogoFile,
          clubName: clubLogoFile ? clubLogoFile.replace('.png', '') : ''
        }
      }
      return m
    }))
  }

  function updateManager(managerId: string, updates: Partial<Manager>) {
    setManagers(managers.map(m => {
      if (m.id === managerId) {
        const updated = { ...m, ...updates }
        if (updates.clubLogoFile !== undefined) {
          updated.clubName = updates.clubLogoFile ? updates.clubLogoFile.replace('.png', '') : ''
        }
        return updated
      }
      return m
    }))
  }

  function showEditManager(managerId: string) {
    const manager = getManagerById(managerId)
    if (manager) {
      setEditClub(manager.clubLogoFile || '')
      setEditBio(manager.bio || '')
      setCurrentEditManagerId(managerId)
    }
  }

  function closeEditManager() {
    setCurrentEditManagerId(null)
    setEditClub('')
    setEditBio('')
  }

  async function resetAllData() {
    if (confirm('Apakah Anda yakin ingin mereset semua data? Tindakan ini tidak dapat dibatalkan! Semua user akan kehilangan data!')) {
      try {
        const defaultManagers = [
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
          }
        ]
        
        const resetState = {
          managers: defaultManagers,
          matches: [],
          matchCounter: 1,
          activeManagerIds: defaultManagers.map(m => m.id)
        }
        
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resetState)
        })
        
        if (response.ok) {
          isRemoteUpdate.current = true

          setManagers(defaultManagers)
          setMatches([])
          setMatchCounter(1)
          setActiveManagerIds(resetState.activeManagerIds)
          setCurrentDetailManagerId(null)
          setCurrentEditManagerId(null)
          setShowMatchForm(false)
          setMatchManager('')
          setMatchOpponent('')
          setMatchGf(0)
          setMatchGa(0)
          setMatchDate('')
          setFilterType('all')
          setFilterComp('all')
          setFilterManager('all')
          setStep('select')
          
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(STORAGE_KEY)
          
          alert('Data berhasil direset untuk semua user!')
        } else {
          throw new Error('Failed to reset on server')
        }
      } catch (e) {
        console.error('Reset error', e)
        alert('Gagal mereset data!')
      }
    }
  }

  // Auto-save untuk perubahan lokal
  useEffect(() => {
    if (!isLoaded) return
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }
    saveState()
  }, [managers, matches, activeManagerIds, isLoaded])

  const filteredMatches = matches.filter((match) => {
    // Hanya match dari manager yang ikut liga
    if (!activeManagerIds.includes(match.managerId)) return false
    if (filterType !== 'all' && match.type !== filterType) return false
    if (filterComp !== 'all' && match.competition !== filterComp) return false
    if (filterManager !== 'all' && match.managerId !== filterManager) return false
    return true
  })

  function recalcStandings() {
    const stats: Record<string, {
      id: string
      name: string
      club: string
      played: number
      w: number
      d: number
      l: number
      gf: number
      ga: number
      pts: number
    }> = {}

    activeManagers.forEach((m) => {
      stats[m.id] = {
        id: m.id,
        name: m.name,
        club: m.clubName,
        played: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        pts: 0
      }
    })

    matches.forEach((match) => {
      if (!match.use) return
      if (!activeManagerIds.includes(match.managerId)) return
      const s = stats[match.managerId]
      if (!s) return
      s.played++
      s.gf += match.gf
      s.ga += match.ga
      const result = computeResult(match.gf, match.ga)
      if (result === "W") s.w++
      else if (result === "L") s.l++
      else s.d++
      s.pts += computePoints(match)
    })

    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdA = a.gf - a.ga
      const gdB = b.gf - b.ga
      if (gdB !== gdA) return gdB - gdA
      if (b.gf !== a.gf) return b.gf - a.gf
      return a.name.localeCompare(b.name)
    })
  }

  const standings = recalcStandings()

  function toggleMatchUse(matchId: number) {
    setMatches(matches.map(m => 
      m.id === matchId ? { ...m, use: !m.use } : m
    ))
  }

  function showManagerDetail(managerId: string) {
    setCurrentDetailManagerId(managerId)
  }

  function showDashboard() {
    setCurrentDetailManagerId(null)
  }

  const editManager = currentEditManagerId ? getManagerById(currentEditManagerId) : null
  const detailManager = currentDetailManagerId ? getManagerById(currentDetailManagerId) : null
  const detailMatches = detailManager ? matches.filter(m => m.managerId === detailManager.id) : []
  const detailStats = detailManager ? (() => {
    const stats = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
    detailMatches.forEach((match) => {
      if (!match.use) return
      const result = computeResult(match.gf, match.ga)
      stats.played++
      stats.gf += match.gf
      stats.ga += match.ga
      if (result === "W") stats.w++
      else if (result === "L") stats.l++
      else stats.d++
      stats.pts += computePoints(match)
    })
    return stats
  })() : null

  // STEP 2: Edit Manager Page
  if (currentEditManagerId && editManager) {
    return (
      <div className="container">
        <header>
          <div className="header-left">
            <div className="title">FM24 MANAGER LEAGUE</div>
            <div className="subtitle">Mini liga 4 manager • gaya Football Manager</div>
          </div>
          <div className="header-right">
            <div className="pill">Season 1</div>
            <button className="btn" onClick={resetAllData} style={{ fontSize: '11px', padding: '4px 10px' }} title="Reset semua data">
              🔄 Reset
            </button>
            <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>

        <main>
          <section className="manager-detail show">
            <button type="button" className="btn back-btn" onClick={closeEditManager}>
              ← Kembali
            </button>
            <h2>Edit Manager – {editManager.name}</h2>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="manager-avatar" style={{ margin: '0 auto', width: '120px', height: '120px' }}>
                  {editManager.photoFile ? (
                    <img
                      src={`/foto/${encodeURIComponent(editManager.photoFile)}`}
                      alt={editManager.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <span className="avatar-initial">
                      {editManager.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {editManager.name}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Club yang Dilatih
                </label>
                <select
                  value={editClub}
                  onChange={(e) => setEditClub(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)'
                  }}
                >
                  <option value="">Pilih Club</option>
                  {CLUB_LOGOS.map(logo => {
                    const clubName = logo.replace('.png', '')
                    return (
                      <option key={logo} value={logo}>{clubName}</option>
                    )
                  })}
                </select>
                {editClub && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <img
                      src={`/logo/${encodeURIComponent(editClub)}`}
                      alt={editClub.replace('.png', '')}
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'contain',
                        padding: '8px',
                        background: 'var(--panel-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                      }}
                    />
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600 }}>
                      {editClub.replace('.png', '')}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Biodata Manager
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tulis biodata manager di sini..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '150px'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {editBio.length} karakter
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={closeEditManager}
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    updateManager(editManager.id, {
                      clubLogoFile: editClub,
                      bio: editBio
                    })
                    closeEditManager()
                  }}
                  style={{ flex: 1 }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // STEP 3: Detail Manager Page
  if (currentDetailManagerId && detailManager) {
    return (
      <div className="container">
        <header>
          <div className="header-left">
            <div className="title">FM24 MANAGER LEAGUE</div>
            <div className="subtitle">Mini liga 4 manager • gaya Football Manager</div>
          </div>
          <div className="header-right">
            <div className="pill">Season 1</div>
            <button className="btn" onClick={resetAllData} style={{ fontSize: '11px', padding: '4px 10px' }} title="Reset semua data">
              🔄 Reset
            </button>
            <button className="btn" onClick={() => setStep('select')}>
              Pilih Peserta
            </button>
            <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>

        <main>
          <section className="manager-detail show">
            <button type="button" className="btn back-btn" onClick={showDashboard}>
              ← Kembali ke dashboard
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ margin: 0 }}>Detail Manager – {detailManager.name} ({detailManager.clubName || "Belum pilih club"})</h2>
              <button
                type="button"
                className="btn"
                onClick={() => showEditManager(detailManager.id)}
              >
                Edit Manager
              </button>
            </div>
            {detailStats && (
              <div className="manager-summary">
                <div className="summary-card">
                  <div className="label">Match</div>
                  <div className="value">{detailStats.played}</div>
                </div>
                <div className="summary-card">
                  <div className="label">W / D / L</div>
                  <div className="value">{detailStats.w} / {detailStats.d} / {detailStats.l}</div>
                </div>
                <div className="summary-card">
                  <div className="label">Goal For / Against</div>
                  <div className="value">{detailStats.gf} / {detailStats.ga}</div>
                </div>
                <div className="summary-card">
                  <div className="label">Total Poin</div>
                  <div className="value">{detailStats.pts}</div>
                </div>
              </div>
            )}
            {detailManager.bio && detailManager.bio.trim() !== '' && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  Biodata
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-main)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {detailManager.bio}
                </div>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table id="manager-detail-table">
                <thead>
                  <tr>
                    <th>Use</th>
                    <th>Tgl</th>
                    <th>Lawan</th>
                    <th>Tipe</th>
                    <th>Kompetisi</th>
                    <th>H/A</th>
                    <th>Skor</th>
                    <th>Hasil</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMatches.map((match) => {
                    const opponent = match.opponentId ? getManagerById(match.opponentId) : null
                    const result = computeResult(match.gf, match.ga)
                    const pts = computePoints(match)
                    return (
                      <tr key={match.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={match.use}
                            onChange={() => toggleMatchUse(match.id)}
                          />
                        </td>
                        <td>{match.date || "-"}</td>
                        <td>{opponent ? opponent.name : match.opponent || "-"}</td>
                        <td>
                          <span className={match.type === "Teman" ? "tag-teman" : "tag-ai"}>
                            {match.type}
                          </span>
                        </td>
                        <td>
                          <span className="tag-komp">{match.competition}</span>
                        </td>
                        <td>{match.ha}</td>
                        <td className={`score-cell ${result === "W" ? "score-win" : result === "L" ? "score-loss" : "score-draw"}`}>
                          {match.gf} - {match.ga}
                        </td>
                        <td>{result}</td>
                        <td>
                          <span className="pts-pill">{pts}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // STEP 1: Halaman PILIH PESERTA (siapa saja yang ikut jadi manager)
  if (step === 'select') {
    return (
      <div className="container">
        <header>
          <div className="header-left">
            <div className="title">FM24 MANAGER LEAGUE</div>
            <div className="subtitle">Pilih dulu siapa yang ikut jadi manager</div>
          </div>
          <div className="header-right">
            <div className="pill">Season 1</div>
            <button className="btn" onClick={resetAllData} style={{ fontSize: '11px', padding: '4px 10px' }} title="Reset semua data">
              🔄 Reset
            </button>
            <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>

        <main>
          <section id="select-managers">
            <h2>Pilih Peserta Liga <span className="badge">Centang yang ikut main</span></h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Teman yang tidak ikut bisa di-uncheck. Halaman berikutnya hanya akan menampilkan manager yang ikut.
            </p>
            <div className="manager-grid">
              {managers.map((manager) => {
                const isActive = activeManagerIds.includes(manager.id)
                const hasPhoto = manager.photoFile && manager.photoFile.trim() !== ''
                const hasLogo = manager.clubLogoFile && manager.clubLogoFile.trim() !== ''
                return (
                  <article key={manager.id} className="manager-card">
                    <div className="manager-avatar">
                      {hasPhoto ? (
                        <img
                          className="manager-photo"
                          src={`/foto/${encodeURIComponent(manager.photoFile)}`}
                          alt={manager.name}
                          style={{ display: 'block' }}
                        />
                      ) : (
                        <span className="avatar-initial">
                          {manager.name ? manager.name.charAt(0).toUpperCase() : "?"}
                        </span>
                      )}
                    </div>
                    <div className="manager-info">
                      <div className="manager-name-row">
                        <span className="manager-name-text">{manager.name}</span>
                      </div>
                      <div className="club-row">
                        {hasLogo && (
                          <img
                            className="club-logo-img"
                            src={`/logo/${encodeURIComponent(manager.clubLogoFile)}`}
                            alt={manager.clubName}
                            style={{ display: 'block' }}
                          />
                        )}
                        <span className="manager-club-text">
                          {hasLogo ? manager.clubName : "Belum pilih club"}
                        </span>
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {
                              setActiveManagerIds((prev) => {
                                if (prev.includes(manager.id)) {
                                  return prev.filter(id => id !== manager.id)
                                } else {
                                  return [...prev, manager.id]
                                }
                              })
                            }}
                          />
                          <span style={{ fontSize: '12px' }}>
                            {isActive ? 'Ikut liga ✔️' : 'Tidak ikut liga'}
                          </span>
                        </label>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn manager-detail-btn"
                            onClick={() => showEditManager(manager.id)}
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Total ikut liga: <strong>{activeManagerIds.length}</strong> manager
              </span>
              <button
                className="btn primary"
                type="button"
                disabled={activeManagerIds.length === 0}
                onClick={() => {
                  if (activeManagerIds.length === 0) {
                    alert('Minimal 1 manager harus ikut liga.')
                    return
                  }
                  setStep('league')
                }}
                style={activeManagerIds.length === 0 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                Lanjut ke Halaman Liga →
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // STEP 4: MAIN DASHBOARD (hanya manager yang ikut liga)
  return (
    <div className="container">
      <header>
        <div className="header-left">
          <div className="title">FM24 MANAGER LEAGUE</div>
          <div className="subtitle">Mini liga • hanya manager yang ikut akan tampil</div>
        </div>
        <div className="header-right">
          <div className="pill">Season 1</div>
          <button className="btn" onClick={resetAllData} style={{ fontSize: '11px', padding: '4px 10px' }} title="Reset semua data">
            🔄 Reset
          </button>
          <button className="btn" onClick={() => setStep('select')}>
            Pilih Peserta
          </button>
          <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Theme: {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>

      <main>
        {/* MANAGER CARDS (hanya yang ikut liga) */}
        <section id="managers">
          <h2>Managers Aktif <span className="badge">Peserta liga ini</span></h2>
          {activeManagers.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Belum ada manager yang dipilih. Klik tombol <strong>Pilih Peserta</strong> di atas.
            </p>
          ) : (
            <div className="manager-grid">
              {activeManagers.map((manager) => {
                const hasPhoto = manager.photoFile && manager.photoFile.trim() !== ''
                const hasLogo = manager.clubLogoFile && manager.clubLogoFile.trim() !== ''
                return (
                  <article key={manager.id} className="manager-card">
                    <div className="manager-avatar">
                      {hasPhoto ? (
                        <img
                          className="manager-photo"
                          src={`/foto/${encodeURIComponent(manager.photoFile)}`}
                          alt={manager.name}
                          style={{ display: 'block' }}
                        />
                      ) : (
                        <span className="avatar-initial">
                          {manager.name ? manager.name.charAt(0).toUpperCase() : "?"}
                        </span>
                      )}
                    </div>
                    <div className="manager-info">
                      <div className="manager-name-row">
                        <span className="manager-name-text">{manager.name}</span>
                      </div>
                      <div className="club-row">
                        {hasLogo && (
                          <img
                            className="club-logo-img"
                            src={`/logo/${encodeURIComponent(manager.clubLogoFile)}`}
                            alt={manager.clubName}
                            style={{ display: 'block' }}
                          />
                        )}
                        <span className="manager-club-text">
                          {hasLogo ? manager.clubName : "Belum pilih club"}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn manager-detail-btn"
                          onClick={() => showManagerDetail(manager.id)}
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          className="btn manager-detail-btn"
                          onClick={() => showEditManager(manager.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn manager-detail-btn primary"
                          onClick={() => selectManagerForMatch(manager.id)}
                        >
                          Tambah Match
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <div className="layout-two" id="dashboard-sections">
          {/* MATCH LIST */}
          <section id="matches">
            <h2>Match List <span className="badge">Input hasil pertandingan</span></h2>

            {showMatchForm && matchManager && (() => {
              const selectedManager = getManagerById(matchManager)
              let detectedType = matchType
              let opponentManager: Manager | null = null
              let opponentClubName: string | null = null
              let opponentLogoFile: string | null = null

              if (matchOpponent) {
                if (matchType === 'Teman') {
                  opponentManager = getManagerById(matchOpponent)
                } else {
                  const managerWithClub = getManagerByClub(matchOpponent)
                  if (managerWithClub && managerWithClub.id !== matchManager) {
                    detectedType = 'Teman'
                    opponentManager = managerWithClub
                  } else {
                    detectedType = 'AI'
                    opponentClubName = matchOpponent
                    opponentLogoFile = `${matchOpponent}.png`
                  }
                }
              }
              
              return (
                <div id="match-form-section" style={{ 
                  background: 'var(--panel-bg-soft)', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  marginBottom: '16px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Input Pertandingan</h3>
                    <button type="button" className="btn" onClick={cancelMatchForm} style={{ fontSize: '11px', padding: '4px 10px' }}>
                      ✕ Batal
                    </button>
                  </div>

                  <form onSubmit={handleAddMatch}>
                    <div className="match-vs-display">
                      <div className="match-team">
                        <div className="match-team-avatar">
                          {selectedManager?.photoFile ? (
                            <img
                              src={`/foto/${encodeURIComponent(selectedManager.photoFile)}`}
                              alt={selectedManager.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          ) : (
                            <span style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>
                              {selectedManager?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="match-team-name">{selectedManager?.name || 'Manager'}</div>
                        {selectedManager?.clubLogoFile && (
                          <img
                            src={`/logo/${encodeURIComponent(selectedManager.clubLogoFile)}`}
                            alt={selectedManager.clubName}
                            style={{ width: '32px', height: '32px', objectFit: 'contain', marginTop: '4px' }}
                          />
                        )}
                      </div>

                      <div className="match-vs-text">VS</div>

                      <div className="match-team">
                        {detectedType === 'Teman' && opponentManager ? (
                          <>
                            <div className="match-team-avatar">
                              {opponentManager.photoFile ? (
                                <img
                                  src={`/foto/${encodeURIComponent(opponentManager.photoFile)}`}
                                  alt={opponentManager.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                              ) : (
                                <span style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>
                                  {opponentManager.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <div className="match-team-name">{opponentManager.name}</div>
                            {opponentManager.clubLogoFile && (
                              <img
                                src={`/logo/${encodeURIComponent(opponentManager.clubLogoFile)}`}
                                alt={opponentManager.clubName}
                                style={{ width: '32px', height: '32px', objectFit: 'contain', marginTop: '4px' }}
                              />
                            )}
                          </>
                        ) : detectedType === 'AI' && opponentLogoFile ? (
                          <>
                            <div className="match-team-avatar" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                              <img
                                src={`/logo/${encodeURIComponent(opponentLogoFile)}`}
                                alt={opponentClubName || 'AI'}
                                style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                            <div className="match-team-name">{opponentClubName || 'AI'}</div>
                          </>
                        ) : (
                          <>
                            <div className="match-team-avatar" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                              <span style={{ fontSize: '24px' }}>?</span>
                            </div>
                            <div className="match-team-name">Pilih Lawan</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="form-grid" style={{ marginTop: '16px' }}>
                      <label>
                        Tipe
                        <select 
                          value={matchType} 
                          onChange={(e) => {
                            setMatchType(e.target.value)
                            setMatchOpponent('')
                          }}
                        >
                          <option value="AI">vs AI</option>
                          <option value="Teman">vs Teman</option>
                        </select>
                      </label>
                      <label>
                        Lawan
                        {matchType === 'AI' ? (
                          <select
                            value={matchOpponent}
                            onChange={(e) => setMatchOpponent(e.target.value)}
                            required
                          >
                            <option value="">Pilih club AI</option>
                            {CLUB_LOGOS.map(logo => {
                              const clubName = logo.replace('.png', '')
                              return (
                                <option key={logo} value={clubName}>{clubName}</option>
                              )
                            })}
                          </select>
                        ) : (
                          <select
                            value={matchOpponent}
                            onChange={(e) => setMatchOpponent(e.target.value)}
                            required
                          >
                            <option value="">Pilih manager lawan</option>
                            {activeManagers
                              .filter(m => m.id !== matchManager)
                              .map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                          </select>
                        )}
                      </label>
                      <label>
                        Tanggal
                        <input
                          type="date"
                          value={matchDate}
                          onChange={(e) => setMatchDate(e.target.value)}
                        />
                      </label>
                      <label>
                        Kompetisi
                        <select
                          value={matchCompetition}
                          onChange={(e) => setMatchCompetition(e.target.value)}
                        >
                          <option value="Liga">Liga</option>
                          <option value="Cup">Cup</option>
                          <option value="Friendly">Friendly</option>
                        </select>
                      </label>
                      <label>
                        Home / Away
                        <select value={matchHa} onChange={(e) => setMatchHa(e.target.value)}>
                          <option value="H">Home</option>
                          <option value="A">Away</option>
                        </select>
                      </label>
                      <label>
                        Gol Kita
                        <input
                          type="number"
                          min="0"
                          value={matchGf}
                          onChange={(e) => setMatchGf(parseInt(e.target.value) || 0)}
                        />
                      </label>
                      <label>
                        Gol Lawan
                        <input
                          type="number"
                          min="0"
                          value={matchGa}
                          onChange={(e) => setMatchGa(parseInt(e.target.value) || 0)}
                        />
                      </label>
                      <div></div>
                    </div>
                    <div className="form-footer">
                      <span className="form-note">
                        {matchOpponent && detectedType === 'Teman' && matchType === 'AI' ? (
                          <span style={{ color: 'var(--accent)' }}>
                            ⚠️ Club ini dipilih oleh manager lain, otomatis menjadi vs Teman
                          </span>
                        ) : matchType === 'AI' ? (
                          'Pilih club. Jika club tidak dipilih manager manapun, otomatis menjadi vs AI.'
                        ) : (
                          'Pilih manager lawan yang akan bertanding.'
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn" onClick={cancelMatchForm}>
                          Batal
                        </button>
                        <button type="submit" className="primary">+ Tambah Match</button>
                      </div>
                    </div>
                  </form>
                </div>
              )
            })()}

            {!showMatchForm && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                Pilih manager dari section "Managers Aktif" di atas untuk menambah pertandingan
              </div>
            )}

            <hr />

            <div className="filters-row">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Filter:</span>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">Semua tipe</option>
                <option value="AI">vs AI</option>
                <option value="Teman">vs Teman</option>
              </select>
              <select value={filterComp} onChange={(e) => setFilterComp(e.target.value)}>
                <option value="all">Semua kompetisi</option>
                <option value="Liga">Liga</option>
                <option value="Cup">Cup</option>
                <option value="Friendly">Friendly</option>
              </select>
              <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
                <option value="all">Semua manager</option>
                {activeManagers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table id="match-table">
                <thead>
                  <tr>
                    <th>Use</th>
                    <th>Tgl</th>
                    <th>Manager</th>
                    <th>Lawan</th>
                    <th>Tipe</th>
                    <th>Kompetisi</th>
                    <th>H/A</th>
                    <th>Skor</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match) => {
                    const mgr = getManagerById(match.managerId)
                    const opponent = match.opponentId ? getManagerById(match.opponentId) : null
                    const pts = computePoints(match)
                    const result = computeResult(match.gf, match.ga)
                    return (
                      <tr key={match.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={match.use}
                            onChange={() => toggleMatchUse(match.id)}
                          />
                        </td>
                        <td>{match.date || "-"}</td>
                        <td>{mgr ? mgr.name : match.managerId}</td>
                        <td>{opponent ? opponent.name : match.opponent || "-"}</td>
                        <td>
                          <span className={match.type === "Teman" ? "tag-teman" : "tag-ai"}>
                            {match.type}
                          </span>
                        </td>
                        <td>
                          <span className="tag-komp">{match.competition}</span>
                        </td>
                        <td>{match.ha}</td>
                        <td className={`score-cell ${result === "W" ? "score-win" : result === "L" ? "score-loss" : "score-draw"}`}>
                          {match.gf} - {match.ga}
                        </td>
                        <td>
                          <span className="pts-pill">{pts}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* STANDINGS */}
          <section id="standings">
            <h2>Klasemen Manager <span className="badge">Hanya peserta aktif</span></h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Manager</th>
                    <th>Club</th>
                    <th>Main</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GM</th>
                    <th>GK</th>
                    <th>SG</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="mini-avatar">
                          {row.name ? row.name.charAt(0).toUpperCase() : "?"}
                        </span>
                        {row.name}
                      </td>
                      <td>
                        <span className="club-text">
                          <span className="club-dot"></span>
                          <span>{row.club || "-"}</span>
                        </span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.w}</td>
                      <td>{row.d}</td>
                      <td>{row.l}</td>
                      <td>{row.gf}</td>
                      <td>{row.ga}</td>
                      <td>{row.gf - row.ga}</td>
                      <td>{row.pts}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                        Belum ada match yang dipakai (centang kolom <strong>Use</strong> di Match List).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
