import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

const RealModel = ({ gender, weight, height }) => {
  const groupRef = useRef();
  
  // We attempt to load actual anatomically correct models from the public folder.
  // The user must place male.glb and female.glb in the public/models directory.
  const modelPath = gender === 'male' ? '/models/male.glb' : '/models/female.glb';
  
  let gltf;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gltf = useGLTF(modelPath);
  } catch (error) {
    console.error(`Could not load ${modelPath}. Make sure the file exists in public/models/`);
  }

  useFrame(() => {
    if (groupRef.current && gltf) {
      // Realistic BMI Scaling
      const h = parseFloat(height) || 1.7;
      const w = parseFloat(weight) || 70;
      
      const hScale = h / 1.7; 
      const expectedWeight = (h * h) * 22; 
      const weightRatio = w / expectedWeight;
      const wScale = Math.pow(weightRatio, 0.5); 

      // Apply dynamic scale
      groupRef.current.scale.set(wScale, hScale, wScale);
      
      // Gentle rotation
      groupRef.current.rotation.y += 0.005;
    }
  });

  if (!gltf) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
    );
  }

  return (
    <group ref={groupRef} position={[0, -1.5, 0]} dispose={null}>
      <primitive object={gltf.scene || gltf.nodes.Scene} />
    </group>
  );
};

const BodyModel = ({ gender, weight, height }) => {
  return (
    <RealModel gender={gender} weight={weight} height={height} />
  );
};

export default BodyModel;