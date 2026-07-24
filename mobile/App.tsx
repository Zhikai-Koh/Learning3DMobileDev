import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

type SubtitleProps = {
  text: string;
};

type PrimaryButtonProp = {
  label: string,
  onPress: () => void
}

function PrimaryButton(props: PrimaryButtonProp) {
  return (
    <Pressable
      style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}
      onPress={props.onPress}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

function Subtitle(props: SubtitleProps) {
  return <Text style={styles.subtitle}>{props.text}</Text>;
}

export default function App() {
  const [message, setMessage] = useState("No action yet.")
  const [noteText, setNoteText] = useState("")

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>My Notes</Text>
        <Subtitle text="A simple note-taking app" />

        <TextInput value={noteText} placeholder="Type your note here..." style={styles.input} onChangeText={setNoteText} />
        <Text>Preview: {noteText}</Text>

        <PrimaryButton label = "Add Notes" onPress = {()=> setNoteText("")}/>
        <PrimaryButton label = "View Notes" onPress = {()=> setMessage("View Notes Pressed!")}/>
        <Text>{message}</Text>

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
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
  input: {
  width: '90%',
  borderWidth: 1,
  borderColor: '#999',
  borderRadius: 8,
  padding: 12,
  marginTop: 16,
  }
});
