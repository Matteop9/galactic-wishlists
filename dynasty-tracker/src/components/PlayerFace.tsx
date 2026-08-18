import { useState } from 'react'

// Sleeper's CDN serves headshots keyed by player_id and team logos keyed by
// team code (DEF roster ids ARE team codes). Free, no auth. Fallback to
// initials when an image is missing.
function faceUrl(playerId: string, position: string): string {
  if (position === 'DEF') {
    return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

interface Props {
  playerId: string
  name: string
  position: string
  size?: number
}

export function PlayerFace({ playerId, name, position, size = 36 }: Props) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (failed) {
    return (
      <span className="face face-fallback" style={style}>
        {initials(name)}
      </span>
    )
  }
  return (
    <img
      className="face"
      style={style}
      src={faceUrl(playerId, position)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
