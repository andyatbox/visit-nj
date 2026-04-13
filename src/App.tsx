import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1. Procedural Texture Generator (Fallback)
// We use a 2:1 aspect ratio canvas for perfect equirectangular mapping
function createFallbackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; // 2:1 aspect ratio
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get 2d context');

  // Create a smooth, non-distorting horizontal gradient (latitudinal bands)
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0a2342');
  gradient.addColorStop(0.5, '#4ba3c3');
  gradient.addColorStop(1, '#0a2342');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle horizontal bands which wrap perfectly around the sphere without pole distortion
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.fillRect(0, i, canvas.width, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace; // Modern color space handling
  return texture;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // --- CAMERA SETUP ---
    // Positioned at -Z to look directly at the horizontal center of the texture map
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.5);

    // --- RENDERER SETUP ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountEl.appendChild(renderer.domElement);

    // --- GEOMETRY & MATERIAL ---
    const geometry = new THREE.SphereGeometry(1.2, 64, 64);

    const fallbackTexture = createFallbackTexture();
    const material = new THREE.MeshBasicMaterial({
      map: fallbackTexture,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    // Rotate sphere so the center of the texture faces the camera at +Z
    // SphereGeometry maps texture center to -X, so rotate +90° to face +Z
    sphereMesh.rotation.y = -Math.PI / 2;
    scene.add(sphereMesh);

    // --- LOAD TEXTURE ---
    const textureLoader = new THREE.TextureLoader();

    let activeTexture: THREE.Texture = fallbackTexture;

    textureLoader.load(
      '/ball-1.jpg',
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        material.map = loadedTexture;
        material.needsUpdate = true;
        activeTexture = loadedTexture;
      }
    );

    // --- CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 2.0;
    controls.maxDistance = 10.0;

    // --- RESIZE HANDLING ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- CLEANUP ON UNMOUNT ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }

      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      fallbackTexture.dispose();

      if (activeTexture !== fallbackTexture) {
        activeTexture.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-screen h-screen overflow-hidden bg-white"
    />
  );
}
