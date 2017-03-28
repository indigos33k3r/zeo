import OBJLoader from './lib/three-extra/OBJLoader';

class Fs {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;

    let live = true;
    this._cleanup = () => {
      live = false;
    };

    return archae.requestPlugins([
      '/core/engines/three',
      '/core/engines/input',
      '/core/engines/webvr',
      '/core/engines/biolumi',
      '/core/engines/rend',
      '/core/plugins/js-utils',
      '/core/plugins/creature-utils',
    ]).then(([
      three,
      input,
      webvr,
      biolumi,
      rend,
      jsUtils,
      creatureUtils,
    ]) => {
      if (live) {
        const {THREE} = three;
        const {events} = jsUtils;
        const {EventEmitter} = events;

        const THREEOBJLoader = OBJLoader(THREE);

        const dragover = e => {
          e.preventDefault();
        };
        document.addEventListener('dragover', dragover);
        const drop = e => {
          e.preventDefault();

          const {dataTransfer: {items}} = e;
          if (items.length > 0) {
            const _getFiles = entries => {
              const result = [];

              const _recurseEntries = entries => Promise.all(entries.map(_recurseEntry));
              const _recurseEntry = entry => new Promise((accept, reject) => {
                if (entry.isFile) {
                  entry.file(file => {
                    file.path = entry.fullPath;

                    result.push(file);

                    accept();
                  });
                } else if (entry.isDirectory) {
                  const directoryReader = entry.createReader();
                  directoryReader.readEntries(entries => {
                    _recurseEntries(Array.from(entries))
                      .then(() => {
                        accept();
                      });
                  });
                } else {
                  accept();
                }
              });
              return _recurseEntries(entries)
                .then(() => result);
            };
            const entries = Array.from(items).map(item => item.webkitGetAsEntry());
            _getFiles(entries)
              .then(files => {
                fsApi.emit('upload', files);
              });
          }
        };
        document.addEventListener('drop', drop);

        this._cleanup = () => {
          document.removeEventListener('dragover', dragover);
          document.removeEventListener('drop', drop);
        };

        class FsFile {
          constructor(url) {
            this.url = url;
          }

          read({type = null} = {}) {
            const {url} = this;

            switch (type) {
              case 'image': {
                return new Promise((accept, reject) => {
                  const img = new Image();
                  img.src = url;
                  img.onload = () => {
                    accept(img);
                  };
                  img.onerror = err => {
                    reject(err);
                  };
                });
              }
              case 'audio': {
                return new Promise((accept, reject) => {
                  const audio = document.createElement('audio');
                  audio.src = url;
                  audio.oncanplay = () => {
                    accept(audio);
                  };
                  audio.onerror = err => {
                    reject(err);
                  };
                });
              }
              case 'video': {
                return new Promise((accept, reject) => {
                  const video = document.createElement('video');
                  video.src = url;
                  video.oncanplay = () => {
                    accept(video);
                  };
                  video.onerror = err => {
                    reject(err);
                  };
                });
              }
              case 'model': {
                const ext = (() => {
                  const match = url.match(/\.([^\/]*)$/);
                  return match ? match[1] : '';
                })();

                return fetch(url)
                  .then(res => {
                    if (ext === 'json') {
                      return res.json();
                    } else {
                      return res.text();
                    }
                  })
                  .then(modelData => new Promise((accept, reject) => {
                    const loader = (() => {
                      switch (ext) {
                        case 'obj':
                          return new THREEOBJLoader();
                        case 'json':
                          return new THREE.ObjectLoader();
                        default:
                          return null;
                      }
                    })();

                    if (loader) {
                      loader.crossOrigin = true;
                    }

                    const baseUrl = url.match(/^(.*?\/?)[^\/]*$/)[1];
                    if (loader instanceof THREEOBJLoader) {
                      loader.setPath(baseUrl);
                    } else if (loader instanceof THREE.ObjectLoader) {
                      loader.setTexturePath(baseUrl);
                    }

                    const _parse = () => {
                      if (loader instanceof THREEOBJLoader) {
                        const modelMesh = loader.parse(modelData);
                        accept(modelMesh);
                      } else if (loader instanceof THREE.ObjectLoader) {
                        loader.parse(modelData, accept);
                      } else {
                        const err = new Error('unknown model type: ' + JSON.stringify(ext));
                        reject(err);
                      }
                    };
                    _parse();
                  }));
              }
              case 'arrayBuffer': {
                return fetch(url)
                  .then(res => res.arrayBuffer());
              }
              default: {
                return fetch(url)
                  .then(res => res.blob());
              }
            }
          }

          write(data) {
            const {url} = this;
            const match = url.match(/^\/fs\/([^\/]+)(\/.*)$/);

            if (match) {
              const id = match[1];
              const path = match[2];

              return fsApi.writeData(id, path, data);
            } else {
              const err = new Error('cannot write to non-local files');
              reject(err);
            }
          }
        }

        class FsApi extends EventEmitter {
          makeFile(url) {
            return new FsFile(url);
          }

          getFileUrl(id, path) {
            if (path) {
              return '/fs/' + id + path;
            } else {
              return '/fs/' + id + '.zip';
            }
          }

          writeFiles(id, files) {
            return Promise.all(files.map(file => this.writeFile(id, file)));
          }

          writeFile(id, file) {
            const {path} = file;
            const fileUrl = this.getFileUrl(id, path);

            return fetch(fileUrl, {
              method: 'PUT',
              body: file,
            }).then(res => res.blob()
              .then(() => {})
            );
          }

          writeData(id, path, data) {
            const fileUrl = this.getFileUrl(id, path);

            return fetch(fileUrl, {
              method: 'PUT',
              body: data,
            }).then(res => res.blob()
              .then(() => {})
            );
          }

          dragover(e) {
            dragover(e);
          }

          drop(e) {
            drop(e);
          }
        }

        const fsApi = new FsApi();
        return fsApi;
      }
    });
  }

  unmount() {
    this._cleanup();
  }
}

const _padNumber = (n, width) => {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
};
const _makeId = () => {
  const array = new Uint8Array(128 / 8);
  crypto.getRandomValues(array);
  return array.reduce((acc, i) => {
    return acc + _padNumber(i.toString(16), 2);
  }, '');
};

module.exports = Fs;
