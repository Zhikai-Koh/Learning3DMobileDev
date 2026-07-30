import { useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber/native";
import { useAssets } from "expo-asset";
import { Image } from "react-native";
import {
  Material,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Texture,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Vector3Tuple = [number, number, number];

type LoadedGlbModelProps = {
  uri: string;
  textureUri?: string;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number | Vector3Tuple;
};

function cloneModel(gltf: GLTF) {
  return gltf.scene.clone(true);
}

function LoadedStandardGlbModel({
  uri,
  position,
  rotation,
  scale,
}: LoadedGlbModelProps) {
  const gltf = useLoader(GLTFLoader, uri);
  const model = useMemo(() => cloneModel(gltf), [gltf]);

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function removeEmbeddedBaseColorTexture(data: ArrayBuffer) {
  const copy = data.slice(0);
  const bytes = new Uint8Array(copy);
  const target = Uint8Array.from("baseColorTexture", (character) =>
    character.charCodeAt(0)
  );
  const replacement = Uint8Array.from("ignoredTextureXX", (character) =>
    character.charCodeAt(0)
  );

  for (let index = 0; index <= bytes.length - target.length; index += 1) {
    let matches = true;

    for (let offset = 0; offset < target.length; offset += 1) {
      if (bytes[index + offset] !== target[offset]) {
        matches = false;
        break;
      }
    }

    if (!matches) {
      continue;
    }

    bytes.set(replacement, index);
  }

  return copy;
}

class GeometryOnlyGLTFLoader extends GLTFLoader {
  override parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void
  ) {
    const texturelessData =
      typeof data === "string" ? data : removeEmbeddedBaseColorTexture(data);

    super.parse(texturelessData, path, onLoad, onError);
  }
}

function applyBaseColorTexture(material: Material, texture: Texture) {
  if (!(material instanceof MeshStandardMaterial)) {
    return material;
  }

  const clonedMaterial = material.clone();
  clonedMaterial.map = texture;
  clonedMaterial.needsUpdate = true;
  return clonedMaterial;
}

function useNativeTexture(uri: string) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let isActive = true;

    Image.getSize(
      uri,
      (width, height) => {
        if (!isActive) {
          return;
        }

        const loadedTexture = new Texture();

        loadedTexture.image = {
          data: { localUri: uri },
          width,
          height,
        };
        loadedTexture.colorSpace = SRGBColorSpace;
        loadedTexture.flipY = false;

        // expo-gl needs the non-DOM texture upload path.
        (loadedTexture as Texture & { isDataTexture: boolean }).isDataTexture =
          true;
        loadedTexture.needsUpdate = true;

        setTexture(loadedTexture);
      },
      (error) => {
        console.error("Could not load the floor texture:", error);
      }
    );

    return () => {
      isActive = false;
    };
  }, [uri]);

  return texture;
}

function LoadedGlbWithExternalTexture({
  uri,
  textureUri,
  position,
  rotation,
  scale,
}: LoadedGlbModelProps & { textureUri: string }) {
  const gltf = useLoader(GeometryOnlyGLTFLoader, uri);
  const texture = useNativeTexture(textureUri);
  const model = useMemo(() => {
    if (!texture) {
      return null;
    }

    const clonedModel = cloneModel(gltf);

    clonedModel.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      object.material = Array.isArray(object.material)
        ? object.material.map((material) =>
            applyBaseColorTexture(material, texture)
          )
        : applyBaseColorTexture(object.material, texture);
    });

    return clonedModel;
  }, [gltf, texture]);

  if (!model) {
    return null;
  }

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function LoadedGlbModel(props: LoadedGlbModelProps) {
  if (props.textureUri) {
    return (
      <LoadedGlbWithExternalTexture
        {...props}
        textureUri={props.textureUri}
      />
    );
  }

  return <LoadedStandardGlbModel {...props} />;
}

type ExpoGlbModelProps = {
  source: number;
  baseColorTextureSource?: number;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number | Vector3Tuple;
};

export function ExpoGlbModel({
  source,
  baseColorTextureSource,
  position,
  rotation,
  scale,
}: ExpoGlbModelProps) {
  const assetSources = useMemo(
    () =>
      baseColorTextureSource
        ? [source, baseColorTextureSource]
        : [source],
    [source, baseColorTextureSource]
  );
  const [assets, error] = useAssets(assetSources);

  if (error) {
    throw error;
  }

  const asset = assets?.[0];
  const uri = asset?.localUri ?? asset?.uri;
  const textureAsset = assets?.[1];
  const textureUri = textureAsset?.localUri ?? textureAsset?.uri;

  if (!uri || (baseColorTextureSource && !textureUri)) {
    return null;
  }

  return (
    <LoadedGlbModel
      uri={uri}
      textureUri={textureUri}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
