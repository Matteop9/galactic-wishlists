import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getStandings } from '@/lib/football';
import NewLeagueForm from './NewLeagueForm';

export default async function NewLeaguePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/leagues/new');

  // default deadline: kick-off day of the earliest default competition (PL / Championship)
  let defaultLockAt = '';
  try {
    const [pl, elc] = await Promise.all([getStandings(2021), getStandings(2016)]);
    const earliest = [pl.season.startDate, elc.season.startDate].sort()[0];
    if (earliest) defaultLockAt = `${earliest}T12:00`;
  } catch {
    // API unavailable — leave the field empty for manual entry
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">New league</h1>
      <p className="mt-1 text-sm text-muted">
        Set it up, share the invite link, and get everyone’s predictions in before kick-off.
      </p>
      <NewLeagueForm defaultLockAt={defaultLockAt} />
    </div>
  );
}
