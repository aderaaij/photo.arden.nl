// Virtual infinite scroll for the homepage carousel.
//
// A module singleton (not React state) so it can be written by window event
// listeners and read inside the R3F render loop without re-renders. Values are
// in *world units* — the same units cover x-positions use.
//
//   attach() in an effect, call update() once per frame, read current/velocity.

class InfiniteScroll {
  /** Where we're easing toward (world units). */
  target = 0
  /** Smoothed current position. */
  current = 0
  /** Signed per-frame delta of `current`. */
  velocity = 0
  /** Low-pass-filtered velocity — what effects read, so the bend sustains
   *  through a scroll instead of flickering for a single frame. */
  smoothVelocity = 0

  /** Max pointer travel during the current press (px) — used to reject drags as clicks. */
  dragDistance = 0

  /** If > 0, magnetically settle to multiples of this (set to cover spacing). */
  snapStep = 0

  // tuning (public so the leva panel can drive them live)
  wheelFactor = 0.0024
  dragFactor = 0.0065
  ease = 0.09
  snapStrength = 0.1

  private last = 0
  private isDown = false
  private startX = 0
  private startTarget = 0
  private attached = false

  attach() {
    if (this.attached) this.detach()
    window.addEventListener('wheel', this.onWheel, { passive: true })
    window.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
    this.attached = true
  }

  detach() {
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    this.attached = false
    this.isDown = false
  }

  /** Ease cover `index` to center via the shortest wrapped path. */
  scrollToIndex(index: number, totalWidth: number) {
    const base = index * this.snapStep
    this.target = base + Math.round((this.current - base) / totalWidth) * totalWidth
  }

  /** Call once per frame, before reading current/velocity. */
  update() {
    // Magnetic settle once motion has mostly stopped (and not actively dragging).
    if (this.snapStep > 0 && !this.isDown && Math.abs(this.velocity) < 0.01) {
      const snapped = Math.round(this.target / this.snapStep) * this.snapStep
      this.target += (snapped - this.target) * this.snapStrength
    }
    this.current += (this.target - this.current) * this.ease
    this.velocity = this.current - this.last
    this.last = this.current
    // Smooth toward the live velocity; ramps up over a few frames and decays out.
    this.smoothVelocity += (this.velocity - this.smoothVelocity) * 0.2
  }

  private onWheel = (e: WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    this.target += d * this.wheelFactor
  }

  private onDown = (e: PointerEvent) => {
    this.isDown = true
    this.startX = e.clientX
    this.startTarget = this.target
    this.dragDistance = 0
  }

  private onMove = (e: PointerEvent) => {
    if (!this.isDown) return
    const dx = e.clientX - this.startX
    this.dragDistance = Math.max(this.dragDistance, Math.abs(dx))
    this.target = this.startTarget - dx * this.dragFactor
  }

  private onUp = () => {
    this.isDown = false
  }
}

export const infiniteScroll = new InfiniteScroll()
