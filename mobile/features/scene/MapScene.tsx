import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame,useThree } from '@react-three/fiber/native';
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Group, Mesh, Vector2, Vector3, Box3 } from 'three';
import Interaction, { direction } from '../game/Interactions';
import { ExpoGlbModel } from './ExpoGlbModel';

const WallWidth = 0.5;
const WallHeight = 2;
const MapSize = 20;

function MapFloor(){
    return(
        <group>
            <Suspense fallback={null}>
                <ExpoGlbModel
                    source={require("../../assets/models/10by10Floor.glb")}
                    baseColorTextureSource={require("../../assets/models/procedural_wood.jpg")}
                    position={[0, 0, 0]}
                />
            </Suspense>
            <mesh position={[0,1,-MapSize/2 - WallWidth/2]} userData={{selectable: false}}>
                <boxGeometry args = {[MapSize, WallHeight, WallWidth]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
            <mesh position={[0,1,MapSize/2 + WallWidth/2]} userData={{selectable: false}}>
                <boxGeometry args = {[MapSize, WallHeight, WallWidth]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
            <mesh position={[MapSize/2 + WallWidth/2,1,0]} userData={{selectable: false}}>
                <boxGeometry args = {[WallWidth,WallHeight,MapSize]}/>
                <meshStandardMaterial color="gray" />
            </mesh>
            <mesh position={[-MapSize/2 - WallWidth/2,1,0]} userData={{selectable: false}}>
                <boxGeometry args = {[WallWidth,WallHeight,MapSize]}/>
                <meshStandardMaterial color="gray"/>
            </mesh>
        </group>
    )
}

type smallCubeProps = {
    selected: boolean;
}

function SmallCube({ selected }: smallCubeProps){
    return(
        <mesh position={[0,2,0]} userData={{selectable: true, id: "smallCube"}}>
            <boxGeometry args = {[1,1,1]}/>
            <meshStandardMaterial color={selected ? "blue" : "red"}/>
        </mesh>
    )
}

type MapCameraProps = {
    cameraPositionRef: React.RefObject<direction>;
};

function MapCamera({ cameraPositionRef }: MapCameraProps){
    const camera = useThree((state) => state.camera);

    useFrame(() => {
        camera.position.set(cameraPositionRef.current.x, cameraPositionRef.current.y, cameraPositionRef.current.z);
    });

    return null;
}

type Vector = {
    x: number;
    y: number;
};

type TapObjectProps = {
    tapPosition: Vector | null;
    setSelectedObject: React.Dispatch<React.SetStateAction<Mesh | null>>;
    setSelectedObjectId: React.Dispatch<React.SetStateAction<String | null>>;
    selectedGroupRef: React.RefObject<Group | null>;
};

function TapObject({ tapPosition, setSelectedObject, setSelectedObjectId, selectedGroupRef }: TapObjectProps) {
    const camera = useThree((state) => state.camera);
    const scene = useThree((state) => state.scene);
    const raycaster = useThree((state) => state.raycaster);

    useEffect(() => {
        if (!tapPosition) return;
            const pointer = new Vector2(tapPosition.x, tapPosition.y);

        raycaster.setFromCamera(pointer, camera);

        const intersections = raycaster.intersectObjects(
            selectedGroupRef.current ? selectedGroupRef.current.children : [],
            true
        );

        const hit = intersections.find((intersection) => intersection.object.userData.selectable === true);

        if (!hit) {
            setSelectedObject(null);
            setSelectedObjectId(null);
            return;
        }

        if (!("isMesh" in hit.object) || hit.object.isMesh !== true) {
            return;
        }

        const mesh = hit.object as Mesh;

        // const materials = Array.isArray(mesh.material)
        // ? mesh.material
        // : [mesh.material];

        // for (const material of materials) {
        //     if ("isMeshStandardMaterial" in material && material.isMeshStandardMaterial === true) {
        //         const standardMaterial = material as MeshStandardMaterial;

        //         standardMaterial.color.set("blue");
        //     }
        // }
        setSelectedObject(mesh);
        setSelectedObjectId(mesh.userData.id);

    }, [tapPosition, camera, scene, raycaster]);

    return null;
}

type ObjectBounds = {
  halfWidth: number;
  halfHeight: number;
  halfDepth: number;
};

export default function Map(){
    const cameraPositionRef = useRef<direction>({x:0,y:40,z:30});
    const [tapPosition, setTapPosition] = useState<Vector| null>(null);
    const [selectedObject, setSelectedObject] = useState<Mesh | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<String | null>(null);
    const selectedBoundsRef = useRef<ObjectBounds | null>(null);
    const selectedGroupRef = useRef<Group | null>(null);

    function moveObject(object: Mesh, direction: direction){
        if(object.position.x + direction.x < -MapSize/2 + (selectedBoundsRef.current?.halfWidth || 0) || object.position.x + direction.x > MapSize/2 - (selectedBoundsRef.current?.halfWidth || 0)){
            return;
        }
        if(object.position.z + direction.z < -MapSize/2 + (selectedBoundsRef.current?.halfDepth || 0) || object.position.z + direction.z > MapSize/2 - (selectedBoundsRef.current?.halfDepth || 0)){
            return;
        }
        if(object.position.y + direction.y < 0 || object.position.y + direction.y > WallHeight){
            return;
        }

        object.position.x += direction.x;
        object.position.y += direction.y;
        object.position.z += direction.z;
    }

    //Capture the bounds of the selected object when it changes
    useEffect(() => {
        if (selectedObject === null) {
            selectedBoundsRef.current = null;
            return;
        }
        const bounds = new Box3().setFromObject(selectedObject);
        const size = new Vector3();

        bounds.getSize(size);

        selectedBoundsRef.current = {
            halfWidth: size.x / 2,
            halfHeight: size.y / 2,
            halfDepth: size.z / 2,
        };
    }, [selectedObject]);

    const handlePinch = useCallback(
        (scaleChange: number) => {
            cameraPositionRef.current.y /= scaleChange;
            cameraPositionRef.current.z /= scaleChange;
        },
        []
    );

    const handleTap = useCallback(
        (tapPosition: Vector) => {
            setTapPosition(tapPosition);
        },
        []
    );

    const handlePan = useCallback(
        (panChange: { x: number; z: number }) => {
            if (selectedObject === null) {
            cameraPositionRef.current.x +=
                panChange.x * 0.1;

            cameraPositionRef.current.z +=
                panChange.z * 0.1;

            return;
            }

            moveObject(selectedObject, {
            x: panChange.x * 0.1,
            y: 0,
            z: panChange.z * 0.1,
            });
        },
        [selectedObject]
    );
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
                <group ref = {selectedGroupRef}>
                    <SmallCube selected={selectedObjectId === "smallCube"}/>
                </group>
                <TapObject tapPosition={tapPosition} setSelectedObject={setSelectedObject} setSelectedObjectId={setSelectedObjectId} selectedGroupRef={selectedGroupRef} />

                <Suspense fallback={null}>
                    <ExpoGlbModel
                        source={require("../../assets/models/Cookie.glb")}
                        position={[0, 1, 4]}
                    />
                </Suspense>
            </Canvas>
            <View style={styles.interactiveBackground}>
                <Interaction onPinch={handlePinch} onPan={handlePan} onTap={handleTap}/>
            </View>
            <View>
                <Pressable style={{position:'absolute', bottom: 20, left: 20, backgroundColor: 'blue', padding: 10, borderRadius: 5}} onPress={() => {
                    cameraPositionRef.current = {x:0,y:40,z:30};
                }}>
                    <Text style={{color: 'white'}}>Reset Camera</Text>
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    interactiveBackground: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
