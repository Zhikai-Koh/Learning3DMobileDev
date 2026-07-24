import React, { useCallback, useRef } from 'react';
import { Canvas, useFrame,useThree } from '@react-three/fiber/native';
import { Pressable, StyleSheet, Text, View } from "react-native";
import {type Group, type Mesh, Camera } from 'three';
import Interaction, { direction } from '../game/Interactions';
import style from 'styled-jsx/style';


function MapFloor(){
    return(
        <group>
            <mesh position={[0,0,0]}>
                <boxGeometry args = {[10,2,10]}/>
                <meshStandardMaterial color="green"/>
            </mesh>
            <mesh position={[0,1,-5]}>
                <boxGeometry args = {[10,2,0.5]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
            <mesh position={[0,1,5]}>
                <boxGeometry args = {[10,2,0.5]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
            <mesh position={[5,1,0]}>
                <boxGeometry args = {[0.5,2,10]}/>
                <meshStandardMaterial color="gray" />
            </mesh>
            <mesh position={[-5,1,0]}>
                <boxGeometry args = {[0.5,2,10]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
            <gridHelper args={[10, 10]} position={[0, 1.01, 0]}/>
        </group>
    )
}

type MapCameraProps = {
    cameraPositionRef: React.MutableRefObject<direction>;
};

function MapCamera({ cameraPositionRef }: MapCameraProps){
    const camera = useThree((state) => state.camera);

    useFrame(() => {
        camera.position.set(cameraPositionRef.current.x, cameraPositionRef.current.y, cameraPositionRef.current.z);
    });

    return null;
}

export default function Map(){
    const cameraPositionRef = useRef<direction>({x:15,y:20,z:15});

    return(
        <View style = {{ flex: 1, backgroundColor: "#111827" }}>
            <Canvas
            camera={{
                position: [cameraPositionRef.current.x, cameraPositionRef.current.y, cameraPositionRef.current.z],
                fov:50
            }}
            onCreated={({ camera }) => {
            camera.lookAt(0, 0, 0);
            }}>
                <MapCamera cameraPositionRef={cameraPositionRef} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 10, 5]} intensity={1.5} />

                <MapFloor/>
            </Canvas>
            <View style={styles.interactiveBackground}>
                <Interaction onMove={(directionChange) => {
                cameraPositionRef.current.x += directionChange.x * 0.1;
                cameraPositionRef.current.z += directionChange.z * 0.1;
                }}/>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    interactiveBackground: {
        backgroundColor: "transparent",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});