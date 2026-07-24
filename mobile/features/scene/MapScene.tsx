import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Pressable, StyleSheet, Text, View } from "react-native";
import {type Group, type Mesh } from 'three';

function MapFloor(){
    return(
        <group>
            <mesh position={[0,0,0]}>
                <boxGeometry args = {[10,2,10]}/>
                <meshStandardMaterial/>
            </mesh>
            <mesh position={[5,1,0]}>
                <boxGeometry args = {[10,2,2]}/>
                <meshStandardMaterial/>
            </mesh>
            <mesh position={[-5,1,0]}>
                <boxGeometry args = {[10,2,2]}/>
                <meshStandardMaterial/>
            </mesh>
            <mesh position={[0,1,5]}>
                <boxGeometry args = {[2,2,10]}/>
                <meshStandardMaterial/>
            </mesh>
            <mesh position={[0,1,-5]}>
                <boxGeometry args = {[2,2,10]}/>
                <meshStandardMaterial/>
            </mesh>
        </group>
    )
}

export default function Map(){
    return(
        <View style = {{ flex: 1, backgroundColor: "#111827" }}>
            <Canvas
            camera={{
                position: [8, 10, 8],
                fov:50
            }}
            onCreated={({ camera }) => {
            camera.lookAt(0, 0, 0);
            }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 10, 5]} intensity={1.5} />

                <MapFloor/>
            </Canvas>
        </View>
    )
}           
