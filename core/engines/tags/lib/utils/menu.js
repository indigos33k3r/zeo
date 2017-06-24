const makeUtils = ({THREE, scene, fs}) => {

const makeZeoComponentElement = baseObject => {
  const entityApis = new Map();

  const componentElement = document.createElement('z-component');
  componentElement.entityAddedCallback = function(entityElement) {
    // per-entity properties
    const {_bound: bound} = entityElement;
    if (!bound) {
      const entityApiState = {};
      const boundComponents = [];

      entityElement.getState = key => entityApiState[key];
      entityElement.setState = (key, newValue) => {
        const oldValue = (key in entityApiState) ? entityApiState[key] : null;

        entityApiState[key] = newValue;

        for (let i = 0; i < boundComponents.length; i++) {
          const boundComponent = boundComponents[i];

          boundComponent.entityStateChangedCallback(entityElement, key, oldValue, newValue);
        }
      };
      entityElement.removeState = key => {
        delete entityApiState[key];
      };
      entityElement.hasState = key => (key in entityApiState);
      entityElement.boundComponents = boundComponents;
      entityElement._bound = true;
    }
    const {boundComponents} = entityElement;
    boundComponents.push(this);

    // per-component properties
    let entityApi = entityApis.get(entityElement);
    if (!entityApi) {
      let entityApiComponentApi = {};
      entityApi = Object.create(entityElement, {
        // bind old methods
        getAttribute: {
          value: entityElement.getAttribute.bind(entityElement),
        },
        setAttribute: {
          value: entityElement.setAttribute.bind(entityElement),
        },
        removeAttribute: {
          value: entityElement.removeAttribute.bind(entityElement),
        },
        hasAttribute: {
          value: entityElement.hasAttribute.bind(entityElement),
        },
        addEventListener: {
          value: entityElement.addEventListener.bind(entityElement),
        },
        removeEventListener: {
          value: entityElement.removeEventListener.bind(entityElement),
        },
        dispatchEvent: {
          value: entityElement.dispatchEvent.bind(entityElement),
        },

        // extensions
        getEntityApi: {
          value: () => entityApiComponentApi,
        },
        setEntityApi: {
          value: newEntityApiComponentApi => {
            entityApiComponentApi = newEntityApiComponentApi;
          },
        },
        getObject: {
          value: () => {
            let {_object: object} = entityElement;

            if (object === null) {
              object = new THREE.Object3D();
              scene.add(object);

              entityElement._object = object;
            }

            return object;
          },
        },
        getData: {
          value: () => _jsonParse(entityElement.innerHTML),
        },
        setData: {
          value: data => {
            entityElement.innerText = JSON.stringify(data, null, 2);
          },
        },
      });
      entityApis.set(entityElement, entityApi);
    }

    if (baseObject.entityAddedCallback) {
      baseObject.entityAddedCallback.call(this, entityApi);
    }
  };
  componentElement.entityRemovedCallback = function(entityElement) {
    const entityApi = entityApis.get(entityElement);
    entityApis.delete(entityElement);

    const {boundComponents} = entityElement;
    boundComponents.splice(boundComponents.indexOf(this), 1);

    if (baseObject.entityRemovedCallback) {
      baseObject.entityRemovedCallback.call(this, entityApi);
    }
  };
  componentElement.entityAttributeValueChangedCallback = function(entityElement, attribute, oldValue, newValue) {
    const entityApi = entityApis.get(entityElement);

    if (baseObject.entityAttributeValueChangedCallback) {
      baseObject.entityAttributeValueChangedCallback.call(this, entityApi, attribute, oldValue, newValue);
    }
  };
  componentElement.entityStateChangedCallback = function(entityElement, key, oldValue, newValue) {
    const entityApi = entityApis.get(entityElement);

    if (baseObject.entityStateChangedCallback) {
      baseObject.entityStateChangedCallback.call(this, entityApi, key, oldValue, newValue);
    }
  };

  componentElement._baseObject = baseObject;

  return componentElement;
};

const castValueStringToValue = (s, type, min, max, step, options) => {
  switch (type) {
    case 'matrix': {
      return _jsonParse(s);
    }
    case 'vector': {
      return _jsonParse(s);
    }
    case 'text': {
      return s;
    }
    case 'color': {
      const match = s.match(/^#?([a-f0-9]{3}(?:[a-f0-9]{3})?)$/i);
      if (match) {
        return '#' + match[1];
      } else {
        return null;
      }
    }
    case 'select': {
      if (options.includes(s)) {
        return s;
      } else {
        return null;
      }
    }
    case 'number': {
      const n = parseFloat(s);

      if (!isNaN(n) && n >= min && n <= max) {
        if (step > 0) {
          return Math.floor(n / step) * step;
        } else {
          return n;
        }
      } else {
        return null;
      }
    }
    case 'checkbox': {
      if (s === 'true') {
        return true;
      } else if (s === 'false') {
        return false;
      } else {
        return null;
      }
    }
    case 'file': {
      return s;
    }
    default: {
      return s;
    }
  }
};
const castValueValueToString = (s, type) => {
  if (typeof s === 'string') {
    return s;
  } else {
    return JSON.stringify(s);
  }
};

const debounce = fn => {
  let running = false;
  let queued = false;

  const _go = () => {
    if (!running) {
      running = true;

      fn(() => {
        running = false;

        if (queued) {
          queued = false;

          _go();
        }
      });
    } else {
      queued = true;
    }
  };
  return _go;
};

const _jsonParse = s => {
  let error = null;
  let result;
  try {
    result = JSON.parse(s);
  } catch (err) {
    error = err;
  }
  if (!error) {
    return result;
  } else {
    return undefined;
  }
};
const _shallowClone = o => {
  const result = {};
  for (const k in o) {
    const v = o[k];
    result[k] = v;
  }
  return result;
};

return {
  makeZeoComponentElement,
  castValueStringToValue,
  castValueValueToString,
  debounce,
};

};

module.exports = {
  makeUtils,
};
