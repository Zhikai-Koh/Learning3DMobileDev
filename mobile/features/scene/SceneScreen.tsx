import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { CubeScene } from './CubeScene';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SceneScreen() {
    const insets = useSafeAreaInsets();
    const [isRotating, setIsRotating] = useState(true);

    const handleToggleRotation = () => {
        setIsRotating((prev) => !prev);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>GPU-rendered cube</Text>

            <View style={styles.canvasContainer}>
                <CubeScene isRotating={isRotating} onToggleRotation={handleToggleRotation} />
            </View>

            <View style={[
                styles.controls,
                { paddingBottom: insets.bottom + 12},
            ]}>
                <Pressable onPress={handleToggleRotation} style={styles.button}>
                    <Text style={styles.buttonText}>
                        {isRotating ? 'Pause cube' : 'Resume cube'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#102a0fff',
    },

    label: {
        color: 'white',
        fontSize: 18,
        padding: 16,
    },

    canvasContainer: {
        flex: 1,
    },

    controls: {
    paddingTop: 12,
    paddingHorizontal: 16,
    },

    button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    },

    buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    },
});