import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Tweens towards `target` so readings glide into place instead of snapping on
 * every MQTT update. Honours prefers-reduced-motion.
 */
export function useAnimatedNumber(target: number | null, duration = 700): number {
  const [value, setValue] = useState(target ?? 0)
  const frame = useRef(0)
  const from = useRef(target ?? 0)

  useEffect(() => {
    if (target === null) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || duration <= 0) {
      from.current = target
      setValue(target)
      return
    }

    const start = performance.now()
    const origin = from.current
    const delta = target - origin
    if (delta === 0) return

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const next = origin + delta * easeOut(progress)
      from.current = next
      setValue(next)
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }

    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return value
}
