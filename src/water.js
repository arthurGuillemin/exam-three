import * as THREE from 'three';

export default class Water {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.clock = new THREE.Clock();
        this.createWater();
    }

    findLowestPoint() {
        let lowestY = Infinity, lowestX = 0, lowestZ = 0;
        for (let x = -80; x < 80; x += 2) {
            for (let z = -80; z < 80; z += 2) {
                const y = this.terrain.getHeightAt(x, z);
                if (y < lowestY) { lowestY = y; lowestX = x; lowestZ = z; }
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
                if (this.terrain.getHeightAt(x, z) > waterLevel + 0.5) { allUnder = false; break; }
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
        this.waterX = x; this.waterZ = z;
        this.waterRadius = lakeSize / 2;
        this.waterY = waterLevel;

        const geometry = new THREE.CircleGeometry(lakeSize / 2, 256);
        //shader by claude 
        const vertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying vec3 vTangent;
            varying vec3 vBitangent;

            vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x2 = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x2) - 0.5;
                vec3 ox = floor(x2 + 0.5);
                vec3 a0 = x2 - ox;
                m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
                vec3 g;
                g.x  = a0.x *x0.x  + h.x *x0.y;
                g.yz = a0.yz*x12.xz + h.yz*x12.yw;
                return 130.0 * dot(m, g);
            }

            float getHeight(vec2 p, float t) {
                float h  = snoise(p * 0.06 + t * 0.12) * 0.22;
                      h += snoise(p * 0.15 + t * 0.20 + vec2(3.1, 1.7)) * 0.12;
                      h += snoise(p * 0.40 - t * 0.35 + vec2(7.3, 2.9)) * 0.055;
                      h += snoise(p * 1.00 + t * 0.60 + vec2(1.5, 8.2)) * 0.025;
                      h += snoise(p * 3.00 - t * 1.20 + vec2(4.4, 6.6)) * 0.010;

                // Ondulations concentriques
                float dist = length(p);
                h += sin(dist * 0.4 - t * 2.5) * 0.012 * max(0.0, 1.0 - dist * 0.03);

                // Sillages croisés
                h += sin(p.x * 0.3 - t * 1.8) * 0.008;
                h += sin(p.y * 0.25 + t * 2.1) * 0.007;
                return h;
            }

            void main() {
                vUv = uv;
                vec3 pos = position;

                pos.z = getHeight(pos.xy, uTime);
                vElevation = pos.z;

                // Calcul TBN précis par différences finies
                float eps = 0.08;
                float hR = getHeight(pos.xy + vec2(eps, 0.0), uTime);
                float hL = getHeight(pos.xy - vec2(eps, 0.0), uTime);
                float hU = getHeight(pos.xy + vec2(0.0, eps), uTime);
                float hD = getHeight(pos.xy - vec2(0.0, eps), uTime);

                vec3 n = normalize(vec3(hL - hR, hD - hU, eps * 2.0));
                vNormal    = (modelMatrix * vec4(n, 0.0)).xyz;
                vTangent   = (modelMatrix * vec4(1.0, 0.0, (hR-hL)/(eps*2.0), 0.0)).xyz;
                vBitangent = (modelMatrix * vec4(0.0, 1.0, (hU-hD)/(eps*2.0), 0.0)).xyz;

                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uCameraPos;
            uniform float uLakeRadius;

            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying vec3 vTangent;
            varying vec3 vBitangent;

            // ── Utilitaires noise ──────────────────────────────────────────
            float hash(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031,0.1030,0.0973));
                p3 += dot(p3, p3.yxz + 33.33);
                return fract((p3.x+p3.y)*p3.z);
            }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                           mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p, int oct) {
                float v=0.0, a=0.5;
                for(int i=0;i<8;i++){
                    if(i>=oct) break;
                    v+=a*noise(p); p*=2.1; a*=0.5;
                }
                return v;
            }

            // ── Caustiques ────────────────────────────────────────────────
            float caustics(vec2 uv, float t) {
                vec2 p = uv * 6.0;
                float c1 = fbm(p + vec2(t*0.07, t*0.05), 4);
                float c2 = fbm(p * 1.3 - vec2(t*0.04, t*0.08), 4);
                float c3 = fbm(p * 0.7 + vec2(t*0.06, -t*0.03), 3);
                // Motif de voronoi simplifié pour look caustique naturel
                float pattern = pow(abs(c1 - c2), 0.8) * pow(abs(c2 - c3), 0.6);
                return pow(1.0 - clamp(pattern * 2.5, 0.0, 1.0), 4.0) * 0.9;
            }

            // ── Normal map procédurale haute fréquence ───────────────────
            vec3 detailNormal(vec2 uv, float t) {
                float eps = 0.003;
                float h0 = fbm(uv*18.0 + t*0.15, 3);
                float hx = fbm((uv+vec2(eps,0.0))*18.0 + t*0.15, 3);
                float hy = fbm((uv+vec2(0.0,eps))*18.0 + t*0.15, 3);
                return normalize(vec3(h0-hx, h0-hy, 0.004));
            }

            void main() {
                vec3 viewDir = normalize(uCameraPos - vWorldPosition);
                vec3 N = normalize(vNormal);

                // Perturbation haute fréquence de la normale
                vec3 dn = detailNormal(vUv, uTime);
                vec3 T  = normalize(vTangent);
                vec3 B  = normalize(vBitangent);
                N = normalize(N + T*dn.x*0.6 + B*dn.y*0.6);

                // ── Fresnel physique (Schlick) ─────────────────────────────
                float cosTheta = max(dot(N, viewDir), 0.0);
                float F0 = 0.035; // eau réelle ~0.02-0.04
                float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
                fresnel = clamp(fresnel, 0.0, 1.0);

                // ── Couleurs de base ───────────────────────────────────────
                // Eau hivernale : plus sombre, légèrement grisée
                vec3 deepCol    = vec3(0.005, 0.022, 0.055);
                vec3 midCol     = vec3(0.012, 0.065, 0.160);
                vec3 shallowCol = vec3(0.030, 0.130, 0.280);

                float depth = clamp(vElevation * 4.0 + 0.5, 0.0, 1.0);
                vec3 waterCol = mix(deepCol, midCol, sqrt(depth));
                waterCol = mix(waterCol, shallowCol, depth * depth);

                // ── Subsurface scattering simulé ───────────────────────────
                vec3 sunDir = normalize(vec3(0.4, 0.9, 0.3));
                float sss = pow(max(dot(viewDir, -sunDir), 0.0), 3.0) * 0.3;
                vec3 sssColor = vec3(0.05, 0.25, 0.40) * sss;
                waterCol += sssColor;

                // ── Caustiques ─────────────────────────────────────────────
                float caust = caustics(vUv, uTime);
                vec3 caustCol = mix(vec3(0.15,0.55,0.85), vec3(0.60,0.90,1.00), caust);
                waterCol += caustCol * caust * 0.28 * (1.0 - depth * 0.6);

                // ── Reflet ciel ────────────────────────────────────────────
                // Ciel hivernal bleu froid
                vec3 skyHorizon = vec3(0.68, 0.80, 0.92);
                vec3 skyZenith  = vec3(0.30, 0.52, 0.78);
                vec3 reflDir = reflect(-viewDir, N);
                float skyT = clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0);
                vec3 skyCol = mix(skyHorizon, skyZenith, skyT);
                waterCol = mix(waterCol, skyCol, fresnel * 0.75);

                // ── Spéculaire soleil multi-lobe ───────────────────────────
                float spec1 = pow(max(dot(reflDir, sunDir), 0.0), 300.0) * 2.5;  // lobe dur
                float spec2 = pow(max(dot(reflDir, sunDir), 0.0), 40.0)  * 0.25; // halo doux
                vec3 specCol = vec3(1.0, 0.97, 0.88) * (spec1 + spec2);
                waterCol += specCol;

                // ── Scintillements de surface (sparkles) ──────────────────
                float sparkle = pow(noise(vUv * 120.0 + uTime * 0.4), 12.0) * 0.5;
                sparkle      += pow(noise(vUv * 80.0  - uTime * 0.3), 10.0) * 0.3;
                waterCol += vec3(0.9, 0.97, 1.0) * sparkle;

                // ── Écume sur les bords du lac ─────────────────────────────
                float edgeDist = length(vUv - 0.5) * 2.0; // 0 au centre, 1 au bord
                float edgeFoam = smoothstep(0.80, 0.99, edgeDist);
                float foamNoise = fbm(vUv * 25.0 + uTime * 0.08, 3);
                edgeFoam *= foamNoise * 1.5;
                edgeFoam  = clamp(edgeFoam, 0.0, 1.0);
                vec3 foamCol = vec3(0.92, 0.96, 1.00);
                waterCol = mix(waterCol, foamCol, edgeFoam * 0.7);

                // ── Écume sur les crêtes des vagues ───────────────────────
                float crestFoam = smoothstep(0.14, 0.22, vElevation);
                float foamTex   = fbm(vUv * 40.0 - uTime * 0.05, 3);
                crestFoam *= foamTex;
                waterCol = mix(waterCol, foamCol, crestFoam * 0.35);

                // ── Brume légère sur l'eau (hiver) ────────────────────────
                float mistFactor = 0.04 + 0.02 * fbm(vUv * 5.0 + uTime * 0.02, 2);
                waterCol = mix(waterCol, vec3(0.82, 0.88, 0.95), mistFactor);

                // ── Opacité ───────────────────────────────────────────────
                float alpha = mix(0.78, 0.96, depth);
                alpha = mix(alpha, 1.0, fresnel * 0.5);
                alpha = mix(alpha, 0.5, edgeFoam * 0.4); // bords légèrement transparents
                alpha = clamp(alpha, 0.72, 0.98);

                gl_FragColor = vec4(waterCol, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime:       { value: 0 },
                uCameraPos:  { value: new THREE.Vector3() },
                uLakeRadius: { value: lakeSize / 2 },
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