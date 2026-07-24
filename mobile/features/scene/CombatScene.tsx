import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import { Group, MathUtils, Vector3 } from "three";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import {
  VirtualJoystick,
  type MovementDirection,
} from "../game/VirtualJoystick";

const MAP_SIZE = 10;
const MAP_HALF_SIZE = MAP_SIZE / 2;
const WALL_HEIGHT = 1.5;
const WALL_THICKNESS = 0.25;

const PLAYER_SIZE = 1;
const PLAYER_HALF_SIZE = PLAYER_SIZE / 2;
const PLAYER_SPEED = 3;
const PLAYER_LIMIT =
  MAP_HALF_SIZE - WALL_THICKNESS / 2 - PLAYER_HALF_SIZE;

const ATTACK_RADIUS = 0.75;
const ENEMY_RADIUS = 0.5;
const ENEMY_POSITION: [number, number, number] = [0, 0, -3];

type MovementDirectionRef = {
  current: MovementDirection;
};

type AttackResult = {
  hit: boolean;
  distance: number;
};

type CombatWorldProps = {
  attackNumber: number;
  movementDirectionRef: MovementDirectionRef;
  onAttackResolved: (result: AttackResult) => void;
};

function Arena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]}>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      <gridHelper args={[MAP_SIZE, MAP_SIZE]} position={[0, -0.5, 0]} />

      <mesh position={[0, WALL_HEIGHT / 2 - 0.5, -MAP_HALF_SIZE]}>
        <boxGeometry args={[MAP_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      <mesh position={[0, WALL_HEIGHT / 2 - 0.5, MAP_HALF_SIZE]}>
        <boxGeometry args={[MAP_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      <mesh position={[-MAP_HALF_SIZE, WALL_HEIGHT / 2 - 0.5, 0]}>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, MAP_SIZE]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      <mesh position={[MAP_HALF_SIZE, WALL_HEIGHT / 2 - 0.5, 0]}>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, MAP_SIZE]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

function CombatWorld({
  attackNumber,
  movementDirectionRef,
  onAttackResolved,
}: CombatWorldProps) {
  const playerRef = useRef<Group>(null);
  const attackPointRef = useRef<Group>(null);
  const enemyRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (!playerRef.current) {
      return;
    }

    const direction = movementDirectionRef.current;
    const isMoving = Math.hypot(direction.x, direction.z) > 0.01;

    if (!isMoving) {
      return;
    }

    const distanceToMove = PLAYER_SPEED * delta;
    const nextX =
      playerRef.current.position.x + direction.x * distanceToMove;
    const nextZ =
      playerRef.current.position.z + direction.z * distanceToMove;

    playerRef.current.position.x = MathUtils.clamp(
      nextX,
      -PLAYER_LIMIT,
      PLAYER_LIMIT
    );
    playerRef.current.position.z = MathUtils.clamp(
      nextZ,
      -PLAYER_LIMIT,
      PLAYER_LIMIT
    );

    // The player's local forward direction is negative Z.
    playerRef.current.rotation.y = Math.atan2(
      -direction.x,
      -direction.z
    );
  });

  useEffect(() => {
    if (attackNumber === 0) {
      return;
    }

    if (!attackPointRef.current || !enemyRef.current) {
      return;
    }

    const attackPosition = new Vector3();
    const enemyPosition = new Vector3();

    attackPointRef.current.getWorldPosition(attackPosition);
    enemyRef.current.getWorldPosition(enemyPosition);

    const distance = attackPosition.distanceTo(enemyPosition);
    const hit = distance <= ATTACK_RADIUS + ENEMY_RADIUS;

    onAttackResolved({ hit, distance });
  }, [attackNumber, onAttackResolved]);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 7, 5]} intensity={1.6} />

      <Arena />

      <group ref={playerRef} position={[0, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>

        <group ref={attackPointRef} position={[0, 0, -1.2]}>
          <mesh>
            <sphereGeometry args={[ATTACK_RADIUS, 16, 16]} />
            <meshBasicMaterial
              color="#ef4444"
              wireframe
              transparent
              opacity={0.55}
            />
          </mesh>
        </group>
      </group>

      <group ref={enemyRef} position={ENEMY_POSITION}>
        <mesh>
          <sphereGeometry args={[ENEMY_RADIUS, 24, 24]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>

        <mesh>
          <sphereGeometry args={[ENEMY_RADIUS, 12, 12]} />
          <meshBasicMaterial color="#facc15" wireframe />
        </mesh>
      </group>
    </>
  );
}

export default function CombatDemo() {
  const insets = useSafeAreaInsets();
  const movementDirectionRef = useRef<MovementDirection>({ x: 0, z: 0 });
  const canAttackRef = useRef(true);
  const [attackNumber, setAttackNumber] = useState(0);
  const [enemyHealth, setEnemyHealth] = useState(30);
  const [isAttackPressed, setIsAttackPressed] = useState(false);
  const [attackMessage, setAttackMessage] = useState(
    "Move toward the enemy, then attack."
  );

  const handleMovement = useCallback((direction: MovementDirection) => {
    movementDirectionRef.current = direction;
  }, []);

  const handleAttackResolved = useCallback((result: AttackResult) => {
    if (result.hit) {
      setEnemyHealth((currentHealth) => {
        const nextHealth = Math.max(0, currentHealth - 10);
        canAttackRef.current = nextHealth > 0;
        return nextHealth;
      });
      setAttackMessage(`Hit! Distance: ${result.distance.toFixed(2)}`);
      return;
    }

    setAttackMessage(`Miss. Distance: ${result.distance.toFixed(2)}`);
  }, []);

  const attack = useCallback(() => {
    if (!canAttackRef.current) {
      return;
    }

    setAttackNumber((currentNumber) => currentNumber + 1);
  }, []);

  const attackGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onBegin(() => {
          if (canAttackRef.current) {
            setIsAttackPressed(true);
          }
        })
        .onEnd(() => {
          attack();
        })
        .onFinalize(() => {
          setIsAttackPressed(false);
        }),
    [attack]
  );

  function resetEnemy() {
    canAttackRef.current = true;
    setAttackNumber(0);
    setEnemyHealth(30);
    setAttackMessage("Move toward the enemy, then attack.");
  }

  const enemyDefeated = enemyHealth === 0;

  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [7, 8, 9], fov: 48 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <CombatWorld
          attackNumber={attackNumber}
          movementDirectionRef={movementDirectionRef}
          onAttackResolved={handleAttackResolved}
        />
      </Canvas>

      <View
        pointerEvents="box-none"
        style={[
          styles.hud,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View pointerEvents="none" style={styles.statusPanel}>
          <Text style={styles.health}>
            {enemyDefeated
              ? "Enemy defeated"
              : `Enemy health: ${enemyHealth}`}
          </Text>
          <Text style={styles.attackMessage}>{attackMessage}</Text>
        </View>

        <View style={styles.controlsRow}>
          <VirtualJoystick
            onMove={handleMovement}
            simultaneousGesture={attackGesture}
          />

          <View style={styles.actionButtons}>
            <GestureDetector gesture={attackGesture}>
              <View
                style={[
                  styles.attackButton,
                  isAttackPressed && styles.buttonPressed,
                  enemyDefeated && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.buttonText}>Attack</Text>
              </View>
            </GestureDetector>

            <Pressable
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={resetEnemy}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  hud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  statusPanel: {
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  health: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  attackMessage: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  actionButtons: {
    width: 112,
    gap: 10,
  },
  attackButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 18,
    borderRadius: 56,
  },
  resetButton: {
    backgroundColor: "#374151",
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    backgroundColor: "#6b7280",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
