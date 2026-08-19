import { useEffect, useState } from 'react'
import { countdown } from '../lib/format'

export function useCountdown(toIso: string | null | undefined) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!toIso) return
    const tick = () => setText(countdown(toIso))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [toIso])
  return text
}
