import { ImageResponse } from 'next/og';
import { OgCard, ogFonts } from '@/lib/og';

export async function GET(req: Request) {
  const domain = new URL(req.url).host;
  const fonts = await ogFonts();
  return new ImageResponse(
    OgCard({
      leagueName: 'Call the table.',
      kicker: 'Predict the table game',
      competitionLabel: 'Season 2026-27',
      subline: 'Predict the final table, first to last, plus the top scorer. Lowest score wins.',
      initials: [],
      overflow: 0,
      playingLine: 'Free with your mates',
      domain,
    }),
    { width: 1200, height: 630, fonts, headers: { 'cache-control': 'public, s-maxage=3600' } },
  );
}
