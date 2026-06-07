import { useEffect } from 'react'
import { EFFECTS } from '../canvas/effects'
import { useAppStore } from '../store/useAppStore'

// Dev/iteration tool: switch between cover effects. Click a button, or use
// number keys (1..N) / [ ] to cycle. Choice persists via the store.
export default function EffectSwitcher() {
  const effectId = useAppStore((s) => s.effectId)
  const setEffectId = useAppStore((s) => s.setEffectId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = EFFECTS.findIndex((x) => x.id === effectId)
      const n = Number(e.key)
      if (n >= 1 && n <= EFFECTS.length) {
        setEffectId(EFFECTS[n - 1].id)
      } else if (e.key === ']') {
        setEffectId(EFFECTS[(idx + 1) % EFFECTS.length].id)
      } else if (e.key === '[') {
        setEffectId(EFFECTS[(idx - 1 + EFFECTS.length) % EFFECTS.length].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [effectId, setEffectId])

  const active = EFFECTS.find((e) => e.id === effectId) ?? EFFECTS[0]

  return (
    <aside className="fx-switcher" aria-label="Cover effect">
      <span className="fx-switcher__label">Effect</span>
      <ul className="fx-switcher__list">
        {EFFECTS.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              className={'fx-btn' + (e.id === effectId ? ' is-active' : '')}
              onClick={() => setEffectId(e.id)}
              title={e.description}
            >
              <span className="fx-btn__num">{i + 1}</span>
              {e.name}
            </button>
          </li>
        ))}
      </ul>
      <p className="fx-switcher__hint">{active.description}</p>
    </aside>
  )
}
