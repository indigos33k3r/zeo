const zlib = require('zlib');

const accepts = require('accept-encoding');

const {
  NUM_CELLS,
  NUM_CELLS_OVERSCAN,

  DEFAULT_SEED,
} = require('./lib/constants/constants');
const protocolUtils = require('./lib/utils/protocol-utils');

const NUM_POSITIONS_CHUNK = 200 * 1024;
const TEXTURE_SIZE = 1024;
const TEXTURE_CHUNK_SIZE = 512;
const NUM_TEXTURE_CHUNKS_WIDTH = TEXTURE_SIZE / TEXTURE_CHUNK_SIZE;
const GENERATOR_PLUGIN = 'generator';

class Grass {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;
    const {dirname, dataDirectory} = archae;
    const {express, ws, app, wss} = archae.getCore();
    const {three, elements, utils: {hash: hashUtils, random: randomUtils, image: imageUtils}} = zeo;
    const {THREE} = three;
    const {murmur} = hashUtils;
    const {alea, vxl} = randomUtils;
    const {jimp} = imageUtils;

    return elements.requestElement(GENERATOR_PLUGIN)
      .then(generatorElement => {
        const upVector = new THREE.Vector3(0, 1, 0);

        const generateBuffer = new Buffer(NUM_POSITIONS_CHUNK);

        const rng = new alea(DEFAULT_SEED);
        const _randInt = (() => {
          const float32Array = new Float32Array(1);
          const int32Array = new Int32Array(float32Array.buffer, float32Array.byteOffset, 1);
          return () => {
            float32Array[0] = rng();
            return int32Array[0];
          };
        })();
        const grassNoise = new vxl.fastNoise({
          seed: _randInt(),
          frequency: 0.1,
          octaves: 4,
        });

        const _requestTextureAtlas = () => new Promise((accept, reject) => {
          class Triangle {
            constructor(a, b, c) {
              this.a = a;
              this.b = b;
              this.c = c;
            }
          }

          const baseColor = new THREE.Color(0x8BC34A);
          const _isPointInTriangle = (p, tri) => {
            const {a: p0, b: p1, c: p2} = tri;
            const A = 1/2 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
            const sign = A < 0 ? -1 : 1;
            const s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y) * sign;
            const t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y) * sign;

            return s > 0 && t > 0 && (s + t) < 2 * A * sign;
          };
          const _isPointInTriangles = (p, ts) => {
            for (let i = 0; i < ts.length; i++) {
              const t = ts[i];
              if (_isPointInTriangle(p, t)) {
                return true;
              }
            }
            return false;
          };

          const img = new jimp(TEXTURE_SIZE, TEXTURE_SIZE);
          for (let y = 0; y < NUM_TEXTURE_CHUNKS_WIDTH; y++) {
            for (let x = 0; x < NUM_TEXTURE_CHUNKS_WIDTH; x++) {
              const numBlades = Math.floor(5 + (rng() * 5));
              const numTrianglesPerBlade = 5;
              const numTriangles = numBlades * numTrianglesPerBlade;
              const triangles = Array(numTriangles);
              for (let i = 0; i < numBlades; i++) {
                const type = rng() < 0.5 ? -1 : 0;
                const flip = rng() < 0.5 ? -1 : 1;
                const w = (type === -1) ? 0.3 : 0.4;
                const h = type === -1 ? 0.6 : 0.25;
                const ox = (rng() * (1 - w)) + (flip === -1 ? w : 0);
                const sy = (1 / h) * (0.25 + rng() * 0.75);
                const points = (type === -1 ? [
                  new THREE.Vector2(0, 0),
                  new THREE.Vector2(0.1, 0),
                  new THREE.Vector2(0.05, 0.2),
                  new THREE.Vector2(0.15, 0.2),
                  new THREE.Vector2(0.125, 0.4),
                  new THREE.Vector2(0.2, 0.4),
                  new THREE.Vector2(0.3, 0.6),
                ] : [
                  new THREE.Vector2(0, 0.2),
                  new THREE.Vector2(0.125, 0.125),
                  new THREE.Vector2(0.1, 0),
                  new THREE.Vector2(0.2, 0),
                  new THREE.Vector2(0.2, 0.13),
                  new THREE.Vector2(0.3, 0.13),
                  new THREE.Vector2(0.4, 0.25),
                ]).map(v => v
                  .multiply(new THREE.Vector2(flip, sy))
                  .add(new THREE.Vector2(ox, 0))
                );

                for (let j = 0; j < numTrianglesPerBlade; j++) {
                  const triangle = new Triangle(
                    points[j + 0],
                    points[j + 1],
                    points[j + 2]
                  );
                  triangles[i * numTrianglesPerBlade + j] = triangle;
                }
              }

              for (let dy = 0; dy < TEXTURE_CHUNK_SIZE; dy++) {
                for (let dx = 0; dx < TEXTURE_CHUNK_SIZE; dx++) {
                  const ax = (x * TEXTURE_CHUNK_SIZE) + dx;
                  const ay = (y * TEXTURE_CHUNK_SIZE) + dy;

                  img.setPixelColor(
                    _isPointInTriangles(
                      new THREE.Vector2(dx / TEXTURE_CHUNK_SIZE, 1 - (dy / TEXTURE_CHUNK_SIZE)),
                      triangles
                    ) ?
                      ((baseColor.clone().multiplyScalar(0.3 + ((1 - (dy / TEXTURE_CHUNK_SIZE)) * 1)).getHex() << 8) | 0xFF)
                    :
                      0x00000000,
                    ax,
                    ay
                  );
                }
              }
            }
          }
          img.getBuffer('image/png', (err, buffer) => {
            if (!err) {
              accept(buffer);
            } else {
              reject(err);
            }
          });
        });

        return _requestTextureAtlas()
          .then(textureAtlasData => {
            const _copyIndices = (src, dst, startIndexIndex, startAttributeIndex) => {
              for (let i = 0; i < src.length; i++) {
                dst[startIndexIndex + i] = src[i] + startAttributeIndex;
              }
            };
            const _makeGrassTemplate = () => {
              const numGrasses = Math.floor(4 + rng() * 4);
              const positions = new Float32Array(NUM_POSITIONS_CHUNK);
              const uvs = new Float32Array(NUM_POSITIONS_CHUNK);
              const indices = new Uint16Array(NUM_POSITIONS_CHUNK);
              let attributeIndex = 0;
              let uvIndex = 0;
              let indexIndex = 0;

              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3(1, 1, 1);
              const matrix = new THREE.Matrix4();

              for (let i = 0; i < numGrasses; i++) {
                position.set(-0.5 + rng(), 0, -0.5 + rng())
                  .normalize()
                  .multiplyScalar(rng() * 1)
                  .add(new THREE.Vector3(0, 0.5, 0));
                quaternion.setFromAxisAngle(upVector, rng() * Math.PI * 2);
                matrix.compose(position, quaternion, scale);
                const geometry = new THREE.PlaneBufferGeometry(1, 1)
                  .applyMatrix(matrix);
                const newPositions = geometry.getAttribute('position').array;
                positions.set(newPositions, attributeIndex);
                const newUvs = geometry.getAttribute('uv').array;
                const numNewUvs = newUvs.length / 2;
                const tx = Math.floor(rng() * NUM_TEXTURE_CHUNKS_WIDTH);
                const ty = Math.floor(rng() * NUM_TEXTURE_CHUNKS_WIDTH);
                for (let j = 0; j < numNewUvs; j++) {
                  const baseIndex = j * 2;
                  newUvs[baseIndex + 0] = ((tx + (0.02 + newUvs[baseIndex + 0] * 0.96)) / NUM_TEXTURE_CHUNKS_WIDTH);
                  newUvs[baseIndex + 1] = 1 - ((tx + (1 - (0.02 + newUvs[baseIndex + 1] * 0.96))) / NUM_TEXTURE_CHUNKS_WIDTH);
                }
                uvs.set(newUvs, uvIndex);
                const newIndices = geometry.index.array;
                _copyIndices(newIndices, indices, indexIndex, attributeIndex / 3);

                attributeIndex += newPositions.length;
                uvIndex += newUvs.length;
                indexIndex += newIndices.length;
              }

              const geometry = new THREE.BufferGeometry();
              geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset, attributeIndex), 3));
              geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.buffer, uvs.byteOffset, uvIndex), 2));
              geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices.buffer, indices.byteOffset, indexIndex), 1));

              return geometry;
            };
            const grassTemplates = (() => {
              const numGrassTemplates = 8;
              const result = Array(numGrassTemplates);
              for (let i = 0; i < numGrassTemplates; i++) {
                result[i] = _makeGrassTemplate();
              }
              return result;
            })();

            const _makeGrassChunkMesh = (ox, oz, grassTemplates) => {
              const positions = new Float32Array(NUM_POSITIONS_CHUNK);
              const uvs = new Float32Array(NUM_POSITIONS_CHUNK);
              const indices = new Uint16Array(NUM_POSITIONS_CHUNK);
              let attributeIndex = 0;
              let uvIndex = 0;
              let indexIndex = 0;

              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              const matrix = new THREE.Matrix4();

              const grassProbability = 0.35;

              for (let dz = 0; dz < NUM_CELLS_OVERSCAN; dz++) {
                for (let dx = 0; dx < NUM_CELLS_OVERSCAN; dx++) {
                  const ax = (ox * NUM_CELLS) + dx;
                  const az = (oz * NUM_CELLS) + dz;
                  const v = grassNoise.in2D(ax + 1000, az + 1000);

                  if (v < grassProbability) {
                    const elevation = generatorElement.getElevation(ax, az);

                    if (elevation > 64) {
                      position.set(
                        ax,
                        elevation,
                        az
                      );
                      quaternion.setFromAxisAngle(upVector, murmur(v + ':angle') / 0xFFFFFFFF * Math.PI * 2);
                      matrix.compose(position, quaternion, scale);
                      scale.set(1, 0.5 + murmur(v + ':scale') / 0xFFFFFFFF, 1);
                      const grassGeometry = grassTemplates[Math.floor(murmur(v + ':template') / 0xFFFFFFFF * grassTemplates.length)];
                      const geometry = grassGeometry.clone()
                        .applyMatrix(matrix);
                      const newPositions = geometry.getAttribute('position').array;
                      positions.set(newPositions, attributeIndex);
                      const newUvs = geometry.getAttribute('uv').array;
                      uvs.set(newUvs, uvIndex);
                      const newIndices = geometry.index.array;
                      _copyIndices(newIndices, indices, indexIndex, attributeIndex / 3);

                      attributeIndex += newPositions.length;
                      uvIndex += newUvs.length;
                      indexIndex += newIndices.length;
                    }
                  }
                }
              }

              const geometry = new THREE.BufferGeometry();
              geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset, attributeIndex), 3));
              geometry.computeBoundingSphere();
              const {boundingSphere} = geometry;

              return {
                positions: new Float32Array(positions.buffer, positions.byteOffset, attributeIndex),
                uvs: new Float32Array(uvs.buffer, uvs.byteOffset, uvIndex),
                indices: new Uint16Array(indices.buffer, indices.byteOffset, indexIndex),
                boundingSphere: Float32Array.from(boundingSphere.center.toArray().concat([boundingSphere.radius])),
              };
            };

            function serveGrassImg(req, res, next) {
              res.type('image/png');
              if (accepts(req, 'gzip')) {
                res.set('Content-Encoding', 'gzip');
                const zs = zlib.createGzip();
                zs.pipe(res);
                res = zs;
              }
              res.end(textureAtlasData);
            }
            app.get('/archae/grass/img/texture-atlas.png', serveGrassImg);

            function serveGrassChunks(req, res, next) {
              const {query: {x: xs, z: zs}} = req;
              const x = parseInt(xs, 10);
              const z = parseInt(zs, 10);

              if (!isNaN(x) && !isNaN(z)) {
                const geometry = _makeGrassChunkMesh(x, z, grassTemplates);

                return generatorElement.requestLightmaps(x, z, geometry.positions)
                  .then(({
                    skyLightmaps,
                    torchLightmaps,
                  }) => {
                    geometry.skyLightmaps = skyLightmaps;
                    geometry.torchLightmaps = torchLightmaps;
                    return geometry;
                  })
                  .then(geometry => {
                    const [_, byteOffset] = protocolUtils.stringifyDataGeometry(geometry, generateBuffer.buffer, generateBuffer.byteOffset);

                    res.type('application/octet-stream');
                    if (accepts(req, 'gzip')) {
                      res.set('Content-Encoding', 'gzip');
                      const zs = zlib.createGzip();
                      zs.pipe(res);
                      res = zs;
                    }
                    res.end(new Buffer(generateBuffer.buffer, generateBuffer.byteOffset, byteOffset));
                  })
                  .catch(err => {
                    res.status(500);
                    res.json({
                      error: err.stack,
                    });
                  });
              } else {
                res.status(400);
                res.send();
              }
            }
            app.get('/archae/grass/chunks', serveGrassChunks);

            this._cleanup = () => {
              function removeMiddlewares(route, i, routes) {
                if (route.handle.name === 'serveGrassImg' || route.handle.name === 'serveGrassChunks') {
                  routes.splice(i, 1);
                }
                if (route.route) {
                  route.route.stack.forEach(removeMiddlewares);
                }
              }
              app._router.stack.forEach(removeMiddlewares);
            };
          });
      });
  }

  unmount() {
    this._cleanup();
  }
}

module.exports = Grass;
