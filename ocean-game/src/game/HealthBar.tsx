import { Html } from '@react-three/drei'

type HealthBarProps = {
  label: string
  health: number
  maxHealth: number
  position: [number, number, number]
}

export function HealthBar({
  label,
  health,
  maxHealth,
  position,
}: HealthBarProps) {
  const healthPercent = (health / maxHealth) * 100

  return (
    <Html position={position} center distanceFactor={8}>
      <div
        className="world-healthbar"
        role="progressbar"
        aria-label={`${label} health`}
        aria-valuemin={0}
        aria-valuemax={maxHealth}
        aria-valuenow={health}
      >
        <span>{label} {health}/{maxHealth}</span>
        <div className="world-healthbar-track">
          <div
            className="world-healthbar-fill"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
    </Html>
  )
}
