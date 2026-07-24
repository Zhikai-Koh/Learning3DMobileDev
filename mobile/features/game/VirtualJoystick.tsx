import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  type TapGesture,
} from "react-native-gesture-handler";

export type MovementDirection = {
  x: number;
  z: number;
};

type VirtualJoystickProps = {
  onMove: (direction: MovementDirection) => void;
  simultaneousGesture: TapGesture;
};

type Point = {
  x: number;
  y: number;
};

const BASE_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_DISTANCE = (BASE_SIZE - KNOB_SIZE) / 2;

function limitToCircle(dx: number, dy: number): Point {
  const distance = Math.hypot(dx, dy);

  if (distance <= MAX_DISTANCE) {
    return { x: dx, y: dy };
  }

  const scale = MAX_DISTANCE / distance;

  return {
    x: dx * scale,
    y: dy * scale,
  };
}

export function VirtualJoystick({
  onMove,
  simultaneousGesture,
}: VirtualJoystickProps) {
  const [knobPosition, setKnobPosition] = useState<Point>({ x: 0, y: 0 });

  const moveJoystick = useCallback(
    (dx: number, dy: number) => {
      const limitedPosition = limitToCircle(dx, dy);

      setKnobPosition(limitedPosition);
      onMove({
        x: limitedPosition.x / MAX_DISTANCE,
        z: limitedPosition.y / MAX_DISTANCE,
      });
    },
    [onMove]
  );

  const resetJoystick = useCallback(() => {
    setKnobPosition({ x: 0, y: 0 });
    onMove({ x: 0, z: 0 });
  }, [onMove]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .simultaneousWithExternalGesture(simultaneousGesture)
        .onUpdate((event) => {
          moveJoystick(event.translationX, event.translationY);
        })
        .onFinalize(() => {
          resetJoystick();
        }),
    [moveJoystick, resetJoystick, simultaneousGesture]
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.base}>
        <View
          style={[
            styles.knob,
            {
              transform: [
                { translateX: knobPosition.x },
                { translateY: knobPosition.y },
              ],
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "#60a5fa",
    borderWidth: 2,
    borderColor: "#dbeafe",
  },
});
