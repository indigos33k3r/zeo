const path = require('path');

const {
  NUM_CELLS,
  NUM_CELLS_OVERSCAN,
} = require('../../constants/constants');

const {three: {THREE}, items, utils: {image: {jimp}}} = zeo;

const chest = objectApi => {
  const _registerTexture = (src, name) => jimp.read(src)
    .then(img => objectApi.registerTexture(name, img));

  return () => Promise.all([
    _registerTexture(path.join(__dirname, '../../img/chest-top.png'), 'chest-top'),
    _registerTexture(path.join(__dirname, '../../img/chest-front.png'), 'chest-front'),
    _registerTexture(path.join(__dirname, '../../img/chest-side.png'), 'chest-side'),
    _registerTexture(path.join(__dirname, '../../img/chest-inside.png'), 'chest-inside'),
  ])
    .then(() => {
      const chestGeometry = (() => {
        const chestTopUvs = objectApi.getUv('chest-top');
        const chestFrontUvs = objectApi.getUv('chest-front');
        const chestSideUvs = objectApi.getUv('chest-side');
        const chestInsideUvs = objectApi.getUv('chest-inside');

        const NUM_POSITIONS = 10 * 1024;

        const baseGeometry = (() => {
          const geometry = new THREE.BoxBufferGeometry(1, 0.5, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5/2, 0));
          const uvs = geometry.getAttribute('uv').array;
          const numUvs = uvs.length / 2;
          for (let i = 0; i < numUvs; i++) {
            const faceIndex = i >> 2;

            let chestUvs;
            if (faceIndex === 0) { // right
              chestUvs = chestTopUvs;
            } else if (faceIndex === 1) { // left
              chestUvs = chestTopUvs;
            } else if (faceIndex === 2) { // top
              chestUvs = chestInsideUvs;
            } else if (faceIndex === 3) { // bottom
              chestUvs = chestTopUvs;
            } else if (faceIndex === 4) { // front
              chestUvs = chestTopUvs;
            } else {
              chestUvs = chestTopUvs;
            }
            const uvWidth = chestUvs[2] - chestUvs[0];
            const uvHeight = chestUvs[3] - chestUvs[1];
            uvs[i * 2 + 0] = chestUvs[0] + (uvs[i * 2 + 0] * uvWidth);
            uvs[i * 2 + 1] = (chestUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
          }

          return geometry;
        })();
        const lidGeometry = (() => {
          const geometry = new THREE.BoxBufferGeometry(1, 0.2, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 1/2 + 0.2/2, 0));
          const uvs = geometry.getAttribute('uv').array;
          const numUvs = uvs.length / 2;
          for (let i = 0; i < numUvs; i++) {
            const faceIndex = i >> 2;

            let chestUvs;
            if (faceIndex === 0) { // right
              chestUvs = chestSideUvs;
            } else if (faceIndex === 1) { // left
              chestUvs = chestSideUvs;
            } else if (faceIndex === 2) { // top
              chestUvs = chestTopUvs;
            } else if (faceIndex === 3) { // bottom
              chestUvs = chestInsideUvs;
            } else if (faceIndex === 4) { // front
              chestUvs = chestFrontUvs;
            } else {
              chestUvs = chestSideUvs;
            }
            const uvWidth = chestUvs[2] - chestUvs[0];
            const uvHeight = chestUvs[3] - chestUvs[1];
            uvs[i * 2 + 0] = chestUvs[0] + (uvs[i * 2 + 0] * uvWidth);
            uvs[i * 2 + 1] = (chestUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
          }

          return geometry;
        })();

        const _copyIndices = (src, dst, startIndexIndex, startAttributeIndex) => {
          for (let i = 0; i < src.length; i++) {
            dst[startIndexIndex + i] = src[i] + startAttributeIndex;
          }
        };

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(NUM_POSITIONS);
        const normals = new Float32Array(NUM_POSITIONS);
        const uvs = new Float32Array(NUM_POSITIONS);
        const indices = new Uint16Array(NUM_POSITIONS);
        let attributeIndex = 0;
        let uvIndex = 0;
        let indexIndex = 0;
        [
          baseGeometry,
          lidGeometry,
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
      objectApi.registerGeometry('chest', chestGeometry);

      const chestOpenGeometry = (() => {
        const chestTopUvs = objectApi.getUv('chest-top');
        const chestFrontUvs = objectApi.getUv('chest-front');
        const chestSideUvs = objectApi.getUv('chest-side');
        const chestInsideUvs = objectApi.getUv('chest-inside');

        const NUM_POSITIONS = 10 * 1024;

        const baseGeometry = (() => {
          const geometry = new THREE.BoxBufferGeometry(1, 0.5, 1)
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5/2, 0));
          const uvs = geometry.getAttribute('uv').array;
          const numUvs = uvs.length / 2;
          for (let i = 0; i < numUvs; i++) {
            const faceIndex = i >> 2;

            let chestUvs;
            if (faceIndex === 0) { // right
              chestUvs = chestTopUvs;
            } else if (faceIndex === 1) { // left
              chestUvs = chestTopUvs;
            } else if (faceIndex === 2) { // top
              chestUvs = chestInsideUvs;
            } else if (faceIndex === 3) { // bottom
              chestUvs = chestTopUvs;
            } else if (faceIndex === 4) { // front
              chestUvs = chestTopUvs;
            } else {
              chestUvs = chestTopUvs;
            }
            const uvWidth = chestUvs[2] - chestUvs[0];
            const uvHeight = chestUvs[3] - chestUvs[1];
            uvs[i * 2 + 0] = chestUvs[0] + (uvs[i * 2 + 0] * uvWidth);
            uvs[i * 2 + 1] = (chestUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
          }

          return geometry;
        })();
        const lidGeometry = (() => {
          const geometry = new THREE.BoxBufferGeometry(1, 0.2, 1)
            .applyMatrix(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0),
              -Math.PI / 2
            )))
            .applyMatrix(new THREE.Matrix4().makeTranslation(0, 1, -1/2 - 0.2/2));
          const uvs = geometry.getAttribute('uv').array;
          const numUvs = uvs.length / 2;
          for (let i = 0; i < numUvs; i++) {
            const faceIndex = i >> 2;

            let chestUvs;
            if (faceIndex === 0) { // right
              chestUvs = chestSideUvs;
            } else if (faceIndex === 1) { // left
              chestUvs = chestSideUvs;
            } else if (faceIndex === 2) { // top
              chestUvs = chestTopUvs;
            } else if (faceIndex === 3) { // bottom
              chestUvs = chestInsideUvs;
            } else if (faceIndex === 4) { // front
              chestUvs = chestFrontUvs;
            } else {
              chestUvs = chestSideUvs;
            }
            const uvWidth = chestUvs[2] - chestUvs[0];
            const uvHeight = chestUvs[3] - chestUvs[1];
            uvs[i * 2 + 0] = chestUvs[0] + (uvs[i * 2 + 0] * uvWidth);
            uvs[i * 2 + 1] = (chestUvs[1] + uvHeight) - (uvs[i * 2 + 1] * uvHeight);
          }

          return geometry;
        })();

        const _copyIndices = (src, dst, startIndexIndex, startAttributeIndex) => {
          for (let i = 0; i < src.length; i++) {
            dst[startIndexIndex + i] = src[i] + startAttributeIndex;
          }
        };

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(NUM_POSITIONS);
        const normals = new Float32Array(NUM_POSITIONS);
        const uvs = new Float32Array(NUM_POSITIONS);
        const indices = new Uint16Array(NUM_POSITIONS);
        let attributeIndex = 0;
        let uvIndex = 0;
        let indexIndex = 0;
        [
          baseGeometry,
          lidGeometry,
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
      objectApi.registerGeometry('chest-open', chestOpenGeometry);

      objectApi.registerGenerator('chest', chunk => {
        if (chunk.x === 0 && chunk.z === 0) {
          const file = items.getFile();
          return file.write(JSON.stringify({
            assets: [ // XXX generate actual assets here
              null,
            ],
          }))
            .then(() => {
              objectApi.addObject(chunk, 'chest', new THREE.Vector3(2, 75, -4), new THREE.Quaternion(), file.n);
            });
        }
        /* const localVector = new THREE.Vector3();
        const localQuaternion = new THREE.Quaternion();
        const localEuler = new THREE.Euler();

        const itemProbability = 0.25;

        for (let dz = 0; dz < NUM_CELLS; dz++) {
          for (let dx = 0; dx < NUM_CELLS; dx++) {
            const v = objectApi.getNoise('items', chunk.x, chunk.z, dx, dz);

            if (v < itemProbability && (objectApi.getHash(String(v)) % 2) === 0) {
              const elevation = Math.floor(objectApi.getElevation(chunk.x * NUM_CELLS + dx, chunk.z * NUM_CELLS + dz));

              if (elevation > 64) {
                const ax = (chunk.x * NUM_CELLS) + dx;
                const az = (chunk.z * NUM_CELLS) + dz;
                localVector.set(ax, elevation, az);
                localQuaternion.setFromEuler(localEuler.set(
                  0,
                  objectApi.getHash(String(v)) / 0xFFFFFFFF * Math.PI * 2,
                  0,
                  'YXZ'
                ));
                objectApi.addObject(chunk, 'stone', localVector, localQuaternion, 0);
              }
            }
          }
        } */
      });

      return () => {
      };
    });
};

module.exports = chest;
