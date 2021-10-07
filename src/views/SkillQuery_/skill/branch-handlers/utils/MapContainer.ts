export default class MapContainer<AttrMap extends Record<string, any>> {
  private _attrMap: AttrMap;

  constructor(mapOrKeys?: string[] | AttrMap) {
    if (Array.isArray(mapOrKeys)) {
      this._attrMap = keysToAttrMap<AttrMap>(mapOrKeys);
    } else if (typeof mapOrKeys === 'object') {
      this._attrMap = mapOrKeys;
    } else {
      this._attrMap = {} as AttrMap;
    }
  }

  append(key: keyof AttrMap) {
    this._attrMap[key] = (null) as AttrMap[keyof AttrMap];
  }

  remove(key: string) {
    delete this._attrMap[key];
  }

  set(key: keyof AttrMap, value: AttrMap[keyof AttrMap]) {
    this._attrMap[key] = value;
  }

  get value() {
    return this._attrMap;
  }
}

function keysToAttrMap<T extends Record<string, any>>(keys: string[]) {
  const newAttrMap = {} as Record<string, any>;
  keys.forEach(key => newAttrMap[key] = null);
  return newAttrMap as T;
}
