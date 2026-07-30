import {useRef, useEffect, useState, type PointerEvent } from 'react'

export function PointerPractice() {
  const [lastEvent, setLastEvent] = useState('none')
  const [pointerType, setPointerType] = useState('unknown')
  const heldKeys = useRef(new Set<string>())

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    setLastEvent(event.type)
    setPointerType(event.pointerType)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === 'KeyW') {
        setLastEvent('w key pressed')
        setPointerType('keyboard')
        heldKeys.current.add(event.code)
      }
    } 

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'KeyW') {
        setLastEvent('w key released')
        setPointerType('keyboard')
        heldKeys.current.delete(event.code)
      }
    }

    function onBlur(){
      heldKeys.current.clear()
      setLastEvent('window lost focus')
    }

    window.addEventListener('keyup', onKeyUp)

    window.addEventListener('keydown', onKeyDown)

    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    } 
  }, [])


  return (
    <section className="practice-card">
      <p className="eyebrow">HTML input surface</p>
      <h2>Pointer practice</h2>
      <p>
        This panel is ordinary HTML. Its events do not use the 3D camera or
        raycasting.
      </p>

      <div className="pointer-pad" onPointerDown={handlePointer} onPointerUp={handlePointer}>
        <p>Press or tap here.</p>
      </div>

      <div className="event-readout" aria-live="polite">
        <div className="readout-item">
          <span>Last event</span>
          <strong>{lastEvent}</strong>
        </div>

        <div className="readout-item">
          <span>Pointer type</span>
          <strong>{pointerType}</strong>
        </div>
      </div>
    </section>
  )
}