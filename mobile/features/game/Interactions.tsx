import { View, Pressable, StyleSheet,Text } from "react-native"
import { useMemo ,useState} from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export type direction = {
    x: number,
    y: number,
    z: number
}

type InteractionProps = {
    onMove: (direction: direction) => void;
};

export default function Interaction({ onMove }: InteractionProps) {

    const [position, setPosition] = useState({ x: 0, y: 0 });

    const panGesture = useMemo(
    () =>
        Gesture.Pan()
        .runOnJS(true)
        .onChange((event) => {
            onMove({
                x: event.changeX,
                y: 0,
                z: event.changeY
            });
            console.log("Touch moved to: ", event.translationX, event.translationY);
        }),
    []
    );

    const tapGesture = useMemo(
    () =>
        Gesture.Tap()
        .runOnJS(true)
        .onBegin(() => {
            console.log("Touch started");
        })
        .onEnd(() => {
            console.log("Tapped");
        })
        .onFinalize((_event, success) => {
            console.log("Touch ended, success: ", success);
        }),
    []
    );

    const combinedGesture = Gesture.Simultaneous(panGesture, tapGesture);
  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={{ flex: 1, backgroundColor: "transparent" }} />
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