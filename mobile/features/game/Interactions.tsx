import { View, Pressable, StyleSheet,Text } from "react-native"
import { useMemo ,useState} from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export type direction = {
    x: number,
    y: number,
    z: number
}

type InteractionProps = {
    onPinch: (scaleChange: number) => void;
    onPan: (panChange: { x: number; z: number }) => void;
    onTap: (tapPosition: { x: number; y: number }) => void;
};

type ViewSize = {
  width: number;
  height: number;
}



export default function Interaction({onPinch, onPan, onTap }: InteractionProps) {
    const [viewSize, setViewSize] = useState<ViewSize>({
      width: 0,
      height: 0,
    });

    const panGesture = useMemo(
    () =>
        Gesture.Pan()
        .runOnJS(true)
        .onChange((event) => {
            onPan({
                x: event.changeX,
                z: event.changeY
            });
            // console.log("Touch moved to: ", event.changeX, event.changeY);
        }),
    [onPan]
    );

    const pinchGesture = useMemo(
    () =>
        Gesture.Pinch()
        .runOnJS(true)
        .onChange((event) => {
            // console.log("Pinch scale: ", event.scaleChange);
            onPinch(event.scaleChange);
        }),
    [onPinch]
    );

const tapGesture = useMemo(
  () =>
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((event) => {
        if (
          viewSize.width === 0 ||
          viewSize.height === 0
        ) {
          return;
        }

        const normalizedX =
          (event.x / viewSize.width) * 2 - 1;

        const normalizedY =
          -(event.y / viewSize.height) * 2 + 1;

        onTap({
          x: normalizedX,
          y: normalizedY,
        });
      }),
  [onTap, viewSize]
);

    const combinedGesture = Gesture.Simultaneous(panGesture, tapGesture, pinchGesture);
  return (
    <GestureDetector gesture={combinedGesture}>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => {
          setViewSize({width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height});
        }}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    padding: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonPressed: {
    backgroundColor: '#0056b3',
  },
  combatButton: {
    backgroundColor: '#dc2626',
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  }
});