const path = require('path');

const {
  NUM_CELLS,
  NUM_CELLS_OVERSCAN,
} = require('../../constants/constants');
const {
  parseBlueprint,
}= require('../../utils/block-utils.js');

const {three: {THREE}, utils: {image: {jimp}}} = zeo;

const NUM_POSITIONS = 10 * 1024;

const BIG_HOUSE_SPEC = parseBlueprint(`\
c=Cobblestone|b=Oak Wood Planks|o=Cobblestone Stairs|d=Door Oak Bottom|w=Oak Wood|g=Glass Pane|s=Oak Wood Stairs|t=Torch
|----Layer 1|
ccccccc  
cbbbbbc  
cbbbbbc  
cbbbbbc  
cbbbbbc  
cbbbbbccc
cbbbbbbbc
cbbbbbbbc
cbbbbbbbc
cbbbbbbbc
ccccccccc
      s  
|----Layer 2|
ccccccc  
c     c  
c     c  
c     c  
c     c  
c     ccc
c       c
c       c
c       c
c       c
ccccccdcc
         
|----Layer 3|
ccccccc  
w     w  
g     g  
g     g  
w     w  
b     bbc
w       w
g       g
g       g
w       w
cbwgwb bc
         
|----Layer 4|
cccccccs 
c     cs 
c     cs 
c     cs 
c     cbs
c     bbc
c       c
c       c
c       c
c     t c
cbbbbbbbc
sssssssss
|----Layer 5|
sbwgwbs  
sb   bs  
sb   bs  
sb   bs  
sb   bs  
sb   bbss
bb   bbbb
bb      b
bb      b
bbbbbbbbb
sssssssss
         
|----Layer 6|
 sbbbs   
 sb bs   
 sb bs   
 sb bs   
 sb bs   
 sb bs   
sbb bbsss
bbbbbbbbb
bbbbbbbbb
sssssssss
         
         
|----Layer 7|
  sbs    
  sbs    
  sbs    
  sbs    
  sbs    
  sbs    
  sbs    
ssbbbssss
sssssssss
         
         
         
`);

const bigHouse = objectApi => {
  return () => Promise.all([
    jimp.read(path.join(__dirname, '../../img/wood.png'))
      .then(houseWoodImg => objectApi.registerTexture('big-house-wood', houseWoodImg)),
    jimp.read(path.join(__dirname, '../../img/stone.png'))
      .then(houseStoneImg => objectApi.registerTexture('big-house-stone', houseStoneImg)),
    jimp.read(path.join(__dirname, '../../img/plank.png'))
      .then(housePlankImg => objectApi.registerTexture('big-house-plank', housePlankImg)),
    jimp.read(path.join(__dirname, '../../img/door.png'))
      .then(doorImg => objectApi.registerTexture('door', doorImg)),
  ])
    .then(() => {
      const _applyUvs = (geometry, x, y, w, h) => {
        const uvs = geometry.getAttribute('uv').array;
        const numUvs = uvs.length / 2;
        for (let i = 0; i < numUvs; i++) {
          uvs[i * 2 + 0] = x + (uvs[i * 2 + 0] * w);
          uvs[i * 2 + 1] = (y + h) - (uvs[i * 2 + 1] * h);
        }
      };
      const _copyIndices = (src, dst, startIndexIndex, startAttributeIndex) => {
        for (let i = 0; i < src.length; i++) {
          dst[startIndexIndex + i] = src[i] + startAttributeIndex;
        }
      };

      const woodStairsGeometry = (() => {
        const woodUvs = objectApi.getUv('big-house-plank');
        const uvWidth = woodUvs[2] - woodUvs[0];
        const uvHeight = woodUvs[3] - woodUvs[1];

        const geometry = (() => {
          const frontGeometry = new THREE.BoxBufferGeometry(1, 1/4, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 1/4/2, 0));

          const middleGeometry = new THREE.BoxBufferGeometry(1, 1/4, 2/3)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 1/4/2 + 1/4, -1/3/2));

          const backGeometry = new THREE.BoxBufferGeometry(1, 1/4, 1/3)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 1/4/2 + 2/4, -2/3/2));

          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(NUM_POSITIONS);
          const normals = new Float32Array(NUM_POSITIONS);
          const uvs = new Float32Array(NUM_POSITIONS);
          const indices = new Uint16Array(NUM_POSITIONS);
          let attributeIndex = 0;
          let uvIndex = 0;
          let indexIndex = 0;
          [
            frontGeometry,
            middleGeometry,
            backGeometry,
          ].forEach(newGeometry => {
            const newPositions = newGeometry.getAttribute('position').array;
            positions.set(newPositions, attributeIndex);
            const newNormals = newGeometry.getAttribute('normal').array;
            normals.set(newNormals, attributeIndex);
            const newUvs = newGeometry.getAttribute('uv').array;
            uvs.set(newUvs, uvIndex);
            const newIndices = newGeometry.index.array;
            _copyIndices(newIndices, indices, indexIndex, attributeIndex / 3);

            attributeIndex += newPositions.length;
            uvIndex += newUvs.length;
            indexIndex += newIndices.length;
          });
          geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset, attributeIndex), 3));
          geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals.buffer, normals.byteOffset, attributeIndex), 3));
          geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.buffer, uvs.byteOffset, uvIndex), 2));
          geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices.buffer, indices.byteOffset, indexIndex), 1));
          return geometry;
        })();
        const uvs = geometry.getAttribute('uv').array;
        const numUvs = uvs.length / 2;
        for (let i = 0; i < numUvs; i++) {
          uvs[i * 2 + 0] = woodUvs[0] + (uvs[i * 2 + 0] * uvWidth);
          uvs[i * 2 + 1] = (woodUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
        }

        return geometry;
      })();
      objectApi.registerGeometry('wood-stairs', woodStairsGeometry);

      const doorGeometry = (() => {
        const woodUvs = objectApi.getUv('door');
        const uvWidth = (woodUvs[2] - woodUvs[0]) * 16 / 38;
        const uvHeight = woodUvs[3] - woodUvs[1];

        const backGeometry = (() => {
          const geometry = new THREE.PlaneBufferGeometry(1, 2, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 2/2, 1/2 - 0.1));

          const uvs = geometry.getAttribute('uv').array;
          const numUvs = uvs.length / 2;
          for (let i = 0; i < numUvs; i++) {
            uvs[i * 2 + 0] = woodUvs[0] + (uvs[i * 2 + 0] * uvWidth);
            uvs[i * 2 + 1] = (woodUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
          }

          return geometry;
        })();
        const frontGeometry = (() => {
          const geometry = new THREE.PlaneBufferGeometry(1, 2, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 2/2, -1/2));

          const uvs = geometry.getAttribute('uv').array;
          uvs.fill(1);

          return geometry;
        })();

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(NUM_POSITIONS);
        const normals = new Float32Array(NUM_POSITIONS);
        const uvs = new Float32Array(NUM_POSITIONS);
        const indices = new Uint16Array(NUM_POSITIONS);
        let attributeIndex = 0;
        let uvIndex = 0;
        let indexIndex = 0;
        [
          backGeometry,
          frontGeometry,
        ].forEach(newGeometry => {
          const newPositions = newGeometry.getAttribute('position').array;
          positions.set(newPositions, attributeIndex);
          const newNormals = newGeometry.getAttribute('normal').array;
          normals.set(newNormals, attributeIndex);
          const newUvs = newGeometry.getAttribute('uv').array;
          uvs.set(newUvs, uvIndex);
          const newIndices = newGeometry.index.array;
          _copyIndices(newIndices, indices, indexIndex, attributeIndex / 3);

          attributeIndex += newPositions.length;
          uvIndex += newUvs.length;
          indexIndex += newIndices.length;
        });
        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset, attributeIndex), 3));
        geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals.buffer, normals.byteOffset, attributeIndex), 3));
        geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.buffer, uvs.byteOffset, uvIndex), 2));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices.buffer, indices.byteOffset, indexIndex), 1));
        return geometry;
      })();
      objectApi.registerGeometry('door', doorGeometry);

      objectApi.registerGenerator('big-house', chunk => {
        if (chunk.x === -1 && chunk.z === -1) {
          const elevation = chunk.heightfield[(0 + (0 * NUM_CELLS_OVERSCAN)) * 8];
          // const elevation = chunk.heightfield[(dx + (dz * NUM_CELLS_OVERSCAN)) * 8];

          const localVector = new THREE.Vector3();
          const localQuaternion = new THREE.Quaternion();

          for (let y = 0; y < BIG_HOUSE_SPEC.length; y++) {
            const layer = BIG_HOUSE_SPEC[y];

            for (let z = 0; z < layer.length; z++) {
              const row = layer[z];

              for (let x = 0; x < layer.length; x++) {
                const col = row[x];

                if (col) {
                  const block = (() => {
                    if (col === 'Cobblestone') {
                      return 'house-stone';
                    } else if (col === 'Oak Wood Planks') {
                      return 'house-plank';
                    } else if (col === 'Cobblestone Stairs') {
                      return 'stone-stairs';
                    } else if (col === 'Oak Wood Stairs') {
                      return 'wood-stairs';
                    } else if (col === 'Door Oak Bottom') {
                      return 'door';
                    } else if (col === 'Oak Wood') {
                      return 'house-wood';
                    } else if (col === 'Glass Pane') {
                      return 'glass';
                    } else if (col === 'Torch') {
                      return 'torch';
                    } else {
                      return 'house-wood';
                    }
                  })();
                  if (col === 'fence-ne') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(1, 0, 0)
                    );
                  } else if (col === 'fence-se') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(0, 0, 1)
                    );
                  } else if (col === 'fence-sw') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(-1, 0, 0)
                    );
                  } else if (col === 'fence-side') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(-1, 0, 0)
                    );
                  } else if (col === 'glass-west') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(-1, 0, 0)
                    );
                  } else if (col === 'glass-east') {
                    localQuaternion.setFromUnitVectors(
                      new THREE.Vector3(0, 0, -1),
                      new THREE.Vector3(1, 0, 0)
                    );
                  } else {
                    localQuaternion.set(0, 0, 0, 1);
                  }
                  objectApi.addObject(chunk, block, localVector.set(chunk.x * NUM_CELLS + x, elevation + y, chunk.z * NUM_CELLS + z), localQuaternion, 0);
                }
              }
            }
          }
        }
      });

      return () => {
      };
    });
};

module.exports = bigHouse;