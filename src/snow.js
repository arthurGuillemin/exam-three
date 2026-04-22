import * as THREE from 'three';

function createSnowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        32, 32, 0,
        32, 32, 32
    );

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}

export default class Snow {
    constructor(scene) {
        this.scene = scene;
        this.createSnow();
    }

    createSnow() {
        const COUNT = 30000;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(COUNT * 3);
        const velocities = new Float32Array(COUNT);

        for (let i = 0; i < COUNT; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 80;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

            velocities[i] = 0.02 + Math.random() * 0.05;
        }

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        );

        const texture = createSnowTexture();

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            map: texture,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geometry, material);
        this.velocities = velocities;

        this.scene.add(this.particles);
    }

    update() {
        const positions = this.particles.geometry.attributes.position.array;
        const COUNT = positions.length / 3;

        for (let i = 0; i < COUNT; i++) {
            positions[i * 3 + 1] -= this.velocities[i];

            positions[i * 3]     += Math.sin(Date.now() * 0.001 + i) * 0.01;
            positions[i * 3 + 2] += Math.cos(Date.now() * 0.001 + i) * 0.01;

            if (positions[i * 3 + 1] < -5) {
                positions[i * 3]     = (Math.random() - 0.5) * 200;
                positions[i * 3 + 1] = 80;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}