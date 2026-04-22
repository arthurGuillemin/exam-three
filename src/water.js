import * as THREE from 'three';

export default class Water {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.clock = new THREE.Clock();
        this.createWater();
    }
    
    findLowestPoint() {
        let lowestY = Infinity;
        let lowestX = 0;
        let lowestZ = 0;

        for (let x = -80; x < 80; x += 2) {
            for (let z = -80; z < 80; z += 2) {
                const y = this.terrain.getHeightAt(x, z);
                if (y < lowestY) {
                    lowestY = y;
                    lowestX = x;
                    lowestZ = z;
                }
            }
        }

        return { x: lowestX, y: lowestY, z: lowestZ };
    }

    getLakeSize(cx, cz, waterLevel) {
        let size = 0;
        for (let r = 1; r < 100; r++) {
            let allUnder = true;
            for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
                const x = cx + Math.cos(angle) * r;
                const z = cz + Math.sin(angle) * r;
                if (this.terrain.getHeightAt(x, z) > waterLevel + 0.5) {
                    allUnder = false;
                    break;
                }
            }
            if (!allUnder) break;
            size = r;
        }
        return Math.max(size * 2, 8);
    }

    createWater() {
        const { x, y, z } = this.findLowestPoint();
        const waterLevel = y + 4;
        const lakeSize = this.getLakeSize(x, z, waterLevel) * 1.5;
        this.waterX = x;
        this.waterZ = z;
        this.waterRadius = lakeSize / 2;
        this.waterY = waterLevel;

        const geometry = new THREE.CircleGeometry(lakeSize / 2, 128);

        const vertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying vec3 vViewDirection;

            // Noise de Perlin simplifié
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m;
                m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vUv = uv;
                vec3 pos = position;

                // Vagues naturelles multi-échelles avec Perlin noise
                vec2 wavePos = pos.xy * 0.08;
                
                // Grande vague lente
                float wave1 = snoise(wavePos + uTime * 0.15) * 0.18;
                
                // Vague moyenne
                float wave2 = snoise(wavePos * 2.3 + uTime * 0.25) * 0.10;
                
                // Petites ondulations rapides
                float wave3 = snoise(wavePos * 5.5 - uTime * 0.45) * 0.045;
                
                // Texture fine de surface
                float wave4 = snoise(wavePos * 12.0 + uTime * 0.8) * 0.022;
                
                // Ondulations circulaires depuis le centre
                float dist = length(pos.xy);
                float ripple = sin(dist * 0.5 - uTime * 2.0) * 0.015 * (1.0 - dist / 50.0);

                pos.z = wave1 + wave2 + wave3 + wave4 + ripple;
                vElevation = pos.z;

                // Calcul de la normale pour un éclairage réaliste
                float epsilon = 0.1;
                vec2 posX = pos.xy + vec2(epsilon, 0.0);
                vec2 posY = pos.xy + vec2(0.0, epsilon);
                
                float hX = snoise(posX * 0.08 + uTime * 0.15) * 0.18 + 
                          snoise(posX * 0.184 + uTime * 0.25) * 0.10;
                float hY = snoise(posY * 0.08 + uTime * 0.15) * 0.18 + 
                          snoise(posY * 0.184 + uTime * 0.25) * 0.10;
                
                vec3 tangentX = normalize(vec3(epsilon, 0.0, hX - pos.z));
                vec3 tangentY = normalize(vec3(0.0, epsilon, hY - pos.z));
                vNormal = normalize(cross(tangentY, tangentX));

                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uCameraPos;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;

            float hash(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * 0.13);
                p3 += dot(p3, p3.yzx + 3.333);
                return fract((p3.x + p3.y) * p3.z);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 4; i++) {
                    value += amplitude * noise(p * frequency);
                    frequency *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            void main() {
                // Palette de couleurs réaliste pour eau de lac
                vec3 deepWater = vec3(0.01, 0.05, 0.15);      // Bleu profond foncé
                vec3 midWater = vec3(0.03, 0.15, 0.35);       // Bleu moyen
                vec3 shallowWater = vec3(0.08, 0.30, 0.52);   // Bleu clair
                vec3 surfaceHighlight = vec3(0.25, 0.55, 0.75); // Reflets cyan
                vec3 foamColor = vec3(0.88, 0.95, 0.98);      // Écume blanche

                // Direction de vue
                vec3 viewDir = normalize(uCameraPos - vWorldPosition);
                
                // Effet Fresnel amélioré
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
                fresnel = clamp(fresnel, 0.0, 1.0);

                // Couleur de base selon la profondeur simulée
                float depth = clamp(vElevation * 3.0 + 0.5, 0.0, 1.0);
                vec3 waterColor = mix(deepWater, midWater, depth * 0.5);
                waterColor = mix(waterColor, shallowWater, depth * depth);

                // Application du Fresnel pour les reflets sur les bords
                waterColor = mix(waterColor, surfaceHighlight, fresnel * 0.6);

                // Caustics dynamiques sous l'eau
                vec2 causticUv = vUv * 8.0;
                float caustic1 = fbm(causticUv + uTime * 0.08);
                float caustic2 = fbm(causticUv * 1.4 - vec2(uTime * 0.05, uTime * 0.07));
                float caustics = pow(caustic1 * caustic2, 1.5) * 0.35;
                
                // Ajout des caustics avec variation de couleur
                vec3 causticColor = vec3(0.4, 0.7, 1.0) * caustics;
                waterColor += causticColor * (1.0 - depth * 0.5);

                // Reflet spéculaire du soleil
                vec3 sunDir = normalize(vec3(0.3, 0.8, 0.5));
                vec3 reflectDir = reflect(-viewDir, vNormal);
                float sunSpec = pow(max(dot(reflectDir, sunDir), 0.0), 120.0);
                waterColor += vec3(1.0, 0.98, 0.90) * sunSpec * 1.2;

                // Reflets diffus du ciel
                float skyReflection = pow(max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0), 0.5);
                vec3 skyColor = vec3(0.4, 0.6, 0.85);
                waterColor = mix(waterColor, skyColor, skyReflection * fresnel * 0.3);

                // Écume sur les crêtes des vagues
                float waveHeight = vElevation;
                float foam = smoothstep(0.12, 0.20, waveHeight);
                foam += smoothstep(-0.15, -0.10, waveHeight) * 0.3; // Creux aussi
                waterColor = mix(waterColor, foamColor, foam * 0.25);

                // Variation subtile de texture
                float textureNoise = noise(vUv * 30.0 + uTime * 0.1) * 0.03;
                waterColor += textureNoise;

                // Scintillement de surface
                float sparkle = pow(noise(vUv * 50.0 + uTime * 0.5), 8.0) * 0.15;
                waterColor += vec3(sparkle);

                // Opacité variable - plus transparent sur les bords et en surface
                float alpha = mix(0.75, 0.92, depth);
                alpha = mix(alpha, 0.88, fresnel * 0.4);
                alpha = clamp(alpha, 0.70, 0.95);

                // Assombrissement subtil en profondeur
                waterColor *= mix(0.85, 1.0, depth);

                gl_FragColor = vec4(waterColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uCameraPos: { value: new THREE.Vector3() },
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(x, waterLevel, z);
        this.scene.add(this.mesh);
    }

    update(camera) {
        const t = this.clock.getElapsedTime();
        this.material.uniforms.uTime.value = t;
        this.material.uniforms.uCameraPos.value.copy(camera.position);
    }
}