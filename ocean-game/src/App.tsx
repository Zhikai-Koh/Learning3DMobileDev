import './App.css'
import { OceanScene } from './components/OceanScene'
import { PointerPractice } from './components/PointerPractice'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Ocean Game · Input Lab 01</p>
          <h1>Pointer events before raycasting</h1>
        </div>
        <p className="lesson-goal">
          First we will observe browser pointer events on HTML. Then we will
          apply the same interaction flow to the 3D scene.
        </p>
      </header>

      <div className="workspace">
        <section className="scene-card" aria-label="3D ocean preview">
          <OceanScene />
          <div className="scene-label">
            <span>3D preview</span>
            <small>No input attached yet</small>
          </div>
        </section>

        <PointerPractice />
      </div>
    </main>
  )
}

export default App
