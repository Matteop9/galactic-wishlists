import { ImageResponse } from 'next/og';
import { getLeagueByCode } from '@/lib/leagues';
import { getUsers } from '@/lib/auth';
import { competitionById } from '@/lib/competitions';
import { OgCard, ogFonts, initialsOf } from '@/lib/og';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const domain = new URL(req.url).host;
  const [fonts, league] = await Promise.all([ogFonts(), getLeagueByCode(code)]);

  if (!league) {
    return new ImageResponse(
      OgCard({
        leagueName: 'Call the table.',
        kicker: 'Predict the table game',
        competitionLabel: 'Season 2026-27',
        subline: 'Predict the final table, first to last. Lowest score wins.',
        initials: [],
        overflow: 0,
        playingLine: 'Free with your mates',
        domain,
      }),
      { width: 1200, height: 630, fonts, headers: { 'cache-control': 'public, s-maxage=3600' } },
    );
  }

  const users = await getUsers();
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));
  const allInitials = league.members.map((m) => initialsOf(nameById.get(m.userId) ?? '?'));
  const shown = allInitials.slice(0, 5);
  const overflow = allInitials.length - shown.length;

  const comps = league.competitionIds
    .map((id) => competitionById(id)?.name)
    .filter((n): n is string => Boolean(n));
  const competitionLabel =
    comps.length === 1 ? comps[0] : comps.length === 2 ? comps.join(' + ') : `${comps.length} leagues`;

  return new ImageResponse(
    OgCard({
      leagueName: league.name,
      kicker: 'You’ve been invited',
      competitionLabel,
      subline: 'Call the final table, first to last. Lowest score wins.',
      initials: shown,
      overflow,
      playingLine: `${league.members.length} playing · ${competitionLabel}`,
      domain,
    }),
    { width: 1200, height: 630, fonts, headers: { 'cache-control': 'public, s-maxage=300' } },
  );
}
