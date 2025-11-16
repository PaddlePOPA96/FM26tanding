'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

function computeResult(gf: number, ga: number) {
  if (gf > ga) return 'W'
  if (gf < ga) return 'L'
  return 'D'
}

function computePoints(match: Match) {
  const result = computeResult(match.gf, match.ga)
  if (result === 'W') return match.type === 'Teman' ? 5 : 3
  if (result === 'D') return match.type === 'Teman' ? 2 : 1
  return 0
}

export default function ManagerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const managerId = params.id as string

  const [manager, setManager] = useState<Manager | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [allManagers, setAllManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to load data')
        }
        const state = await res.json()
        const managers: Manager[] = state.managers || []
        const allMatches: Match[] = state.matches || []

        setAllManagers(managers)
        const found = managers.find(m => m.id === managerId) || null
        setManager(found)

        const myMatches = allMatches.filter(m => m.managerId === managerId)
        setMatches(myMatches)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    if (managerId) {
      load()
    }
  }, [managerId])

  if (loading) {
    return (
      <div className="container">
        <header>
          <div className="header-left">
            <div className="title">FM24 MANAGER LEAGUE</div>
            <div className="subtitle">Loading detail manager...</div>
          </div>
        </header>
      </div>
    )
  }

  if (!manager) {
    return (
      <div className="container">
        <header>
          <div className="header-left">
            <div className="title">FM24 MANAGER LEAGUE</div>
            <div className="subtitle">Manager tidak ditemukan</div>
          </div>
        </header>
        <main>
          <section className="manager-detail show">
            <button
              type="button"
              className="btn back-btn"
              onClick={() => router.push('/')}
            >
              ← Kembali ke dashboard
            </button>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              ID: {managerId}
            </p>
          </section>
        </main>
      </div>
    )
  }

  const usedMatches = matches.filter(m => m.use)
  const stats = usedMatches.reduce(
    (acc, match) => {
      const result = computeResult(match.gf, match.ga)
      acc.played++
      acc.gf += match.gf
      acc.ga += match.ga
      if (result === 'W') acc.w++
      else if (result === 'L') acc.l++
      else acc.d++
      acc.pts += computePoints(match)
      return acc
    },
    { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
  )

  const getManagerById = (id: string): Manager | null => {
    return allManagers.find(m => m.id === id) ?? null
  }

  return (
    <div className="container">
      <header>
        <div className="header-left">
          <div className="title">FM24 MANAGER LEAGUE</div>
          <div className="subtitle">Detail Manager</div>
        </div>
        <div className="header-right">
          <button
            className="btn"
            onClick={() => router.push('/')}
          >
            ← Kembali ke Liga
          </button>
        </div>
      </header>

      <main>
        <section className="manager-detail show">
          {/* HEADER: FOTO + NAMA + LOGO CLUB */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '2px solid var(--border)',
                background: 'var(--panel-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {manager.photoFile ? (
                <img
                  src={`/foto/${encodeURIComponent(manager.photoFile)}`}
                  alt={manager.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '32px',
                    fontWeight: 700
                  }}
                >
                  {manager.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '4px'
                }}
              >
                {manager.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {manager.clubLogoFile && (
                  <img
                    src={`/logo/${encodeURIComponent(manager.clubLogoFile)}`}
                    alt={manager.clubName}
                    style={{
                      width: '32px',
                      height: '32px',
                      objectFit: 'contain'
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  {manager.clubName || 'Belum pilih club'}
                </span>
              </div>
            </div>
          </div>

          {/* RINGKASAN STAT */}
          <div className="manager-summary">
            <div className="summary-card">
              <div className="label">Match</div>
              <div className="value">{stats.played}</div>
            </div>
            <div className="summary-card">
              <div className="label">W / D / L</div>
              <div className="value">
                {stats.w} / {stats.d} / {stats.l}
              </div>
            </div>
            <div className="summary-card">
              <div className="label">Goal For / Against</div>
              <div className="value">
                {stats.gf} / {stats.ga}
              </div>
            </div>
            <div className="summary-card">
              <div className="label">Total Poin</div>
              <div className="value">{stats.pts}</div>
            </div>
          </div>

          {/* BIODATA (KALAU ADA) */}
          {manager.bio && manager.bio.trim() !== '' && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  fontWeight: 600
                }}
              >
                Biodata
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {manager.bio}
              </div>
            </div>
          )}

          {/* TABEL MATCH */}
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table id="manager-detail-table">
              <thead>
                <tr>
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
                {matches.map(match => {
                  const opponent = match.opponentId
                    ? getManagerById(match.opponentId)
                    : null
                  const result = computeResult(match.gf, match.ga)
                  const pts = computePoints(match)
                  return (
                    <tr key={match.id}>
                      <td>{match.date || '-'}</td>
                      <td>{opponent ? opponent.name : match.opponent || '-'}</td>
                      <td>
                        <span
                          className={
                            match.type === 'Teman' ? 'tag-teman' : 'tag-ai'
                          }
                        >
                          {match.type}
                        </span>
                      </td>
                      <td>
                        <span className="tag-komp">
                          {match.competition}
                        </span>
                      </td>
                      <td>{match.ha}</td>
                      <td
                        className={`score-cell ${
                          result === 'W'
                            ? 'score-win'
                            : result === 'L'
                            ? 'score-loss'
                            : 'score-draw'
                        }`}
                      >
                        {match.gf} - {match.ga}
                      </td>
                      <td>{result}</td>
                      <td>
                        <span className="pts-pill">{pts}</span>
                      </td>
                    </tr>
                  )
                })}
                {matches.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '12px'
                      }}
                    >
                      Belum ada match untuk manager ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
