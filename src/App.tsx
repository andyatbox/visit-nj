import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const TEXTURES = ['/ball-1.jpg', '/ball-2.jpg', '/ball-3.jpg', '/ball-4.jpg'];

function getInitialIndex() {
  const param = new URLSearchParams(window.location.search).get('ball');
  const n = parseInt(param ?? '1', 10);
  return Math.min(Math.max(n - 1, 0), TEXTURES.length - 1);
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const activeTextureRef = useRef<THREE.Texture | null>(null);
  const [active, setActive] = useState(getInitialIndex);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // --- CAMERA SETUP ---
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    // --- RENDERER SETUP ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountEl.appendChild(renderer.domElement);

    // --- GEOMETRY & MATERIAL ---
    const geometry = new THREE.SphereGeometry(1.2, 64, 64);
    const material = new THREE.MeshBasicMaterial();
    materialRef.current = material;

    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.rotation.y = -Math.PI / 2;
    scene.add(sphereMesh);

    // --- LOAD INITIAL TEXTURE ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(TEXTURES[getInitialIndex()], (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      material.map = tex;
      material.needsUpdate = true;
      activeTextureRef.current = tex;
    });

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
      if (mountEl.contains(renderer.domElement)) mountEl.removeChild(renderer.domElement);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      activeTextureRef.current?.dispose();
    };
  }, []);

  const switchTexture = (index: number) => {
    const material = materialRef.current;
    if (!material) return;
    setActive(index);
    const params = new URLSearchParams(window.location.search);
    params.set('ball', String(index + 1));
    window.history.replaceState(null, '', '?' + params.toString());
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(TEXTURES[index], (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const prev = activeTextureRef.current;
      material.map = tex;
      material.needsUpdate = true;
      activeTextureRef.current = tex;
      prev?.dispose();
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {TEXTURES.map((_, i) => (
          <button
            key={i}
            onClick={() => switchTexture(i)}
            className={`px-5 py-2 rounded-full text-sm font-semibold shadow-lg transition-all ${
              active === i
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Ball {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
