import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchGameweeks, fetchSeasons } from '../lib/queries'
import RequireAuth from '../components/RequireAuth'
import { GwStatusChip, PageTitle } from '../components/ui'
import { gwDate } from '../lib/format'

function GameweeksInner() {
  const { data: gws } = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: fetchSeasons })
  const seasonName = (id: string) => seasons?.find((s) => s.id === id)?.name ?? ''

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (gws ?? []).filter((g) => g.gw_date >= today && g.status !== 'settled')
  const past = (gws ?? []).filter((g) => g.gw_date < today || g.status === 'settled').reverse()

  const Section = ({ title, list }: { title: string; list: typeof upcoming }) => (
    <>
      <div className="overline mb-2 mt-4 px-1">{title}</div>
      <div className="rounded-[14px] bg-surface">
        {list.map((g) => (
          <Link
            key={g.id}
            to={`/gameweeks/${g.id}`}
            className="flex items-center justify-between border-b px-3.5 py-3"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <div>
              <div className="font-mono text-[13px] font-semibold">{gwDate(g.gw_date)}</div>
              <div className="text-[10.5px] text-muted">{seasonName(g.season_id)}</div>
            </div>
            <GwStatusChip status={g.status} />
          </Link>
        ))}
        {list.length === 0 && <div className="p-5 text-center text-sm text-muted">Nothing here.</div>}
      </div>
    </>
  )

  return (
    <div className="px-4 pb-6">
      <PageTitle>GAMEWEEKS</PageTitle>
      <Section title="UPCOMING" list={upcoming.slice(0, 6)} />
      <Section title="HISTORY" list={past} />
    </div>
  )
}

export default function Gameweeks() {
  return (
    <RequireAuth>
      <GameweeksInner />
    </RequireAuth>
  )
}
