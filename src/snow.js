import * as THREE from 'three';

function createSnowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const cx = 32, cy = 32, r = 28;

    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const ex = cx + Math.cos(angle) * r;
        const ey = cy + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        for (let t = 0.3; t <= 0.7; t += 0.2) {
            const bx = cx + Math.cos(angle) * r * t;
            const by = cy + Math.sin(angle) * r * t;
            const branchLen = r * 0.25;

            [-1, 1].forEach(side => {
                const ba = angle + side * Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(
                    bx + Math.cos(ba) * branchLen,
                    by + Math.sin(ba) * branchLen
                );
                ctx.stroke();
            });
        }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}
export default class Snow {
    constructor(scene) {
        this.scene = scene;
        this.createSnow();
    }

    createSnow() {
        const COUNT = 50000;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(COUNT * 3);
        const velocities = new Float32Array(COUNT);
        const directions = new Float32Array(COUNT * 2);

        for (let i = 0; i < COUNT; i++) {
            const i3 = i * 3;
            const i2 = i * 2;


            positions[i3]     = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = Math.random() * 80;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;

            velocities[i] = 0.02 + Math.random() * 0.01;

            const angle = Math.random() * Math.PI * 2;
            directions[i2]     = Math.cos(angle);
            directions[i2 + 1] = Math.sin(angle);
        }

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        );

        const texture = createSnowTexture();

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });

        this.particles = new THREE.Points(geometry, material);
        this.velocities = velocities;
        this.directions = directions;

        this.scene.add(this.particles);
    }

    update() {
        const positions = this.particles.geometry.attributes.position.array;
        const velocities = this.velocities;
        const directions = this.directions;

        const COUNT = positions.length / 3;

        for (let i = 0; i < COUNT; i++) {
            const i3 = i * 3;
            const i2 = i * 2;

            positions[i3 + 1] -= velocities[i];

            positions[i3]     += directions[i2] * 0.01;
            positions[i3 + 2] += directions[i2 + 1] * 0.01;

            if (positions[i3 + 1] < -5) {
                positions[i3]     = (Math.random() - 0.5) * 200;
                positions[i3 + 1] = 80;
                positions[i3 + 2] = (Math.random() - 0.5) * 200;
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}