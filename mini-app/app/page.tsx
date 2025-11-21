import { description, title } from "@/lib/metadata";
import { generateMetadata } from "@/lib/farcaster-embed";

export { generateMetadata };

export default function Home() {
  return (
    <main className="flex flex-col gap-3 place-items-center place-content-center px-4 grow h-screen overflow-hidden">
      <span className="text-2xl">{title}</span>
      <span className="text-muted-foreground">{description}</span>
      <div id="game" className="w-full h-full"></div>
      <script dangerouslySetInnerHTML={{ __html: `// Game logic here
        (function() {
          const container = document.getElementById('game');
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          container.appendChild(renderer.domElement);

          // Lighting
          const light = new THREE.DirectionalLight(0xffffff, 1);
          light.position.set(0, 100, 0);
          scene.add(light);
          const ambient = new THREE.AmbientLight(0x404040);
          scene.add(ambient);

          // Fog
          scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

          // Simplex noise
          const simplex = new SimplexNoise();

          // Chunk system
          const CHUNK_SIZE = 16;
          const CHUNK_HEIGHT = 64;
          const chunks = {};

          function generateChunk(x, z) {
            const geometry = new THREE.Geometry();
            for (let i = 0; i < CHUNK_SIZE; i++) {
              for (let k = 0; k < CHUNK_SIZE; k++) {
                const worldX = x * CHUNK_SIZE + i;
                const worldZ = z * CHUNK_SIZE + k;
                const height = Math.floor((simplex.noise2D(worldX / 50, worldZ / 50) + 1) * 10) + 20;
                for (let y = 0; y < height && y < CHUNK_HEIGHT; y++) {
                  const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshLambertMaterial({ color: 0x8b4513 })
                  );
                  cube.position.set(worldX, y, worldZ);
                  geometry.mergeMesh(cube);
                }
              }
            }
            const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
            mesh.position.set(x * CHUNK_SIZE, 0, z * CHUNK_SIZE);
            scene.add(mesh);
            chunks[`${x},${z}`] = mesh;
          }

          // Load initial chunks around player
          const playerPos = { x: 0, z: 0 };
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              generateChunk(playerPos.x + dx, playerPos.z + dz);
            }
          }

          // Player
          const player = {
            mesh: new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 1.8, 0.5),
              new THREE.MeshBasicMaterial({ color: 0xff0000 })
            ),
            velocity: new THREE.Vector3(),
            onGround: false
          };
          scene.add(player.mesh);
          camera.position.set(0, 1.6, 0);

          // Controls
          const controls = new THREE.PointerLockControls(camera, renderer.domElement);
          document.addEventListener('click', () => controls.lock());

          // Movement
          const move = { forward: false, backward: false, left: false, right: false };
          const speed = 5;
          const gravity = -9.8;
          const jumpSpeed = 5;

          document.addEventListener('keydown', (e) => {
            switch (e.code) {
              case 'KeyW': move.forward = true; break;
              case 'KeyS': move.backward = true; break;
              case 'KeyA': move.left = true; break;
              case 'KeyD': move.right = true; break;
              case 'Space':
                if (player.onGround) player.velocity.y = jumpSpeed;
                break;
            }
          });
          document.addEventListener('keyup', (e) => {
            switch (e.code) {
              case 'KeyW': move.forward = false; break;
              case 'KeyS': move.backward = false; break;
              case 'KeyA': move.left = false; break;
              case 'KeyD': move.right = false; break;
            }
          });

          // Animation loop
          const clock = new THREE.Clock();
          function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();

            // Apply gravity
            player.velocity.y += gravity * delta;
            // Movement
            const direction = new THREE.Vector3();
            if (move.forward) direction.z -= 1;
            if (move.backward) direction.z += 1;
            if (move.left) direction.x -= 1;
            if (move.right) direction.x += 1;
            direction.normalize();
            direction.applyQuaternion(player.mesh.quaternion);
            direction.multiplyScalar(speed * delta);
            player.mesh.position.add(direction);
            player.mesh.position.y += player.velocity.y * delta;

            // Simple ground collision
            if (player.mesh.position.y < 1.6) {
              player.mesh.position.y = 1.6;
              player.velocity.y = 0;
              player.onGround = true;
            } else {
              player.onGround = false;
            }

            // Update camera
            camera.position.copy(player.mesh.position).add(new THREE.Vector3(0, 0.6, 0));

            renderer.render(scene, camera);
          }
          animate();

          // Resize
          window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          });

          // Store position
          const savePosition = () => {
            localStorage.setItem('playerPos', JSON.stringify({
              x: player.mesh.position.x,
              y: player.mesh.position.y,
              z: player.mesh.position.z
            }));
          };
          window.addEventListener('beforeunload', savePosition);
          // Load position
          const stored = localStorage.getItem('playerPos');
          if (stored) {
            const pos = JSON.parse(stored);
            player.mesh.position.set(pos.x, pos.y, pos.z);
            camera.position.set(pos.x, pos.y + 0.6, pos.z);
          }
        })();` }} />
    </main>
  );
}
