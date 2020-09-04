import StatBase from "../../module/StatBase.js";
import { SubWeapon, SubArmor } from "./CharacterEquipment.js";

class Character {
  constructor(name) {
    this.name = name;

    this.level = 1;
    this._baseStats = [];
    this._optinalBaseStat = null;

    this.equipmentFields = [];
  }

  get baseStats() {
    const res = this._baseStats.slice();
    this._optinalBaseStat && res.push(this._optinalBaseStat);
    return res;
  }

  init() {
    this._baseStats.push(...['STR', 'DEX', 'INT', 'AGI', 'VIT']
      .map(p => new CharacterBaseStat(p)));

    this.equipmentFields.push(...[
      EquipmentField.TYPE_MAIN_WEAPON,
      EquipmentField.TYPE_SUB_WEAPON,
      EquipmentField.TYPE_BODY_ARMOR,
      EquipmentField.TYPE_ADDITIONAL,
      EquipmentField.TYPE_SPECIAL,
      EquipmentField.TYPE_AVATAR,
      EquipmentField.TYPE_AVATAR,
      EquipmentField.TYPE_AVATAR
    ].map((p, i) => new EquipmentField(i, p)));

    return this;
  }
  equipmentField(type) {
    return this.equipmentFields.find(p => p.type == type);
  }
  fieldEquipment(type) {
    const t = this.equipmentField(type);
    return t ? (t.equipment || void 0) : void 0;
  }
  hasOptinalBaseStat() {
    return this._optinalBaseStat ? true : false;
  }
  setOptinalBaseStat(name) {
    const list = Character.OPTIONAL_BASE_STAT_LIST;
    if (!list.includes(name))
      throw new Error('argument "name" must be in the following list: ' + list.join(', '));

    this._optinalBaseStat = new CharacterBaseStat(name);
  }
  clearOptinalBaseStat() {
    this._optinalBaseStat = null;
  }
  baseStat(name) {
    if (Character.OPTIONAL_BASE_STAT_LIST.includes(name))
      return this._optinalBaseStat == null || this._optinalBaseStat.name != name ?
        null : this._optinalBaseStat;
    return this._baseStats.find(p => p.name == name);
  }
  baseStatValue(name) {
    const stat = this.baseStat(name);
    return stat ? stat.value : 0;
  }
  checkFieldEquipmentType(field_type, eq_type) {
    const field = this.equipmentField(field_type);
    if (field.isEmpty())
      return eq_type == EquipmentField.EMPTY;

    const eq = field.equipment;
    return eq.type == eq_type;
  }
}
Character.OPTIONAL_BASE_STAT_LIST = ['TEC', 'MEN', 'LUK', 'CRT'];

class CharacterBaseStat {
  constructor(name, value = 1) {
    this.name = name;
    this.value = value;
  }
}

class EquipmentField {
  constructor(id, type) {
    this.type = type;

    this.equipment = null;
  }
  setEquipment(eq) {
    this.equipment = eq;
  }
  removeEquipment() {
    this.equipment = null;
  }
  isEmpty() {
    return this.equipment == null;
  }
  statsDisable() {
    if (!this.isEmpty() && this.type == EquipmentField.TYPE_SUB_WEAPON) {
      const eq = this.equipment;
      return !(eq instanceof SubWeapon) && !(eq instanceof SubArmor);
    }
    return false;
  }
}

EquipmentField.TYPE_MAIN_WEAPON = Symbol('main-weapon');
EquipmentField.TYPE_SUB_WEAPON = Symbol('sub-weapon');
EquipmentField.TYPE_BODY_ARMOR = Symbol('body-armor');
EquipmentField.TYPE_ADDITIONAL = Symbol('additional');
EquipmentField.TYPE_SPECIAL = Symbol('special');
EquipmentField.TYPE_AVATAR = Symbol('avatar');

EquipmentField.EMPTY = Symbol();

class EquipmentFieldItem {
  constructor(parent, type) {
    this._parent = parent;
    this.type = type;
  }
  value() {
    // const eq = this.belongField.currentEquipment();
    switch (this.type) {
      case EquipmentFieldItem.TYPE_STATS:
        this.value = [];
        break;
      case EquipmentFieldItem.TYPE_ATK:
        this.value = 0;
        break;
      case EquipmentFieldItem.TYPE_DEF:
        this.value = 0;
        break;
      case EquipmentFieldItem.TYPE_STABILITY:
        this.value = 60;
        break;
      case EquipmentFieldItem.TYPE_REFINING:
        this.value = 0;
    }
  }
  get belongField() {
    return this._parent;
  }
}

EquipmentFieldItem.TYPE_STATS = Symbol('stats');
EquipmentFieldItem.TYPE_ATK = Symbol('atk');
EquipmentFieldItem.TYPE_DEF = Symbol('def');
EquipmentFieldItem.TYPE_STABILITY = Symbol('stability');
EquipmentFieldItem.TYPE_REFINING = Symbol('refining');

class CharacterStatCategory {
  constructor(name) {
    this.name = name;
    this.stats = [];
  }
  appendStat(...args) {
    const t = new CharacterStat(this, ...args);
    this.stats.push(t);
    return t;
  }
}


class CharacterStat {
  constructor(cat, id, name, displayFormula, link, max, min, caption, hidden_option) {
    this.category = cat;

    this.id = id;
    this.name = name;
    this.displayFormula = displayFormula;
    this.link = link;
    this.max = max;
    this.min = min;
    this.caption = caption;
    this.options = {
      hidden: hidden_option // -1: default, 0: always hidden, 1: hidden when cvalue, mvalue and tvalue are zero
    };

    this._formula = null;
  }
  setFormula(str) {
    this._formula = new CharacterStatFormula(this, str);
    return this._formula;
  }
  result(character_simple_stats, vars) {
    try {
      const res = this._formula.calc(character_simple_stats, vars);
      let value = res.value;
      if (typeof value != 'number')
        value = parseFloat(value);
      if (this.max != null && value > this.max)
        value = this.max;
      if (this.min != null && value < this.min)
        value = this.min;

      const ho = this.options.hidden;
      let displayFormula = this.displayFormula;
      if (!displayFormula.match(/\$(?:\.\d)?v/)) {
        displayFormula = '$v' + displayFormula;
      }
      const displayValue = displayFormula.replace(/\$(?:\.(\d))?v/, (m, m1) => {
        return m1 !== void 0 ?
          value.toFixed(parseInt(m1, 10)) :
          Math.floor(value);
      });

      return {
        origin: this,
        value,
        displayValue,
        statValueParts: res.statValueParts,
        statPartsDetail: res.statPartsDetail,
        hidden: ho == 0 ||
          (ho == 1 && Object.values(res.statValueParts).every(a => a == 0)) ||
          (ho == 2 && value == 0)
      };
    } catch (e) {
      console.warn(e);
      return 0;
    }
  }
}


class CharacterStatFormula {
  constructor(parent, str) {
    this._parent = parent;
    this.formula = str;
    this.conditionValues = [];
  }
  get belongCharacterStat() {
    return this._parent;
  }
  appendConditionValue(conditional, formula) {
    this.conditionValues.push({
      conditional,
      formula
    });
  }
  calc(simple_stats, vars) {
    const reduceValue = v => { // eslint-disable-line
      const neg = v < 0;
      v = Math.abs(v);

      let p = 1, res = neg ? 100 : 0;

      while (v != 0) {
        const t = Math.min(v, 50);
        res = neg ? res * (100 + t) / 100 : res + t / p;
        v -= t;
        p *= 2;
      }

      return neg ? -1 * (res - 100) : res;
    };

    const safeEval = (v, dv) => {
      try {
        return eval(v);
      } catch (e) {
        console.warn('error handle: ' + v);
        console.warn(e);
        return dv === void 0 ? '0' : dv;
      }
    };

    const handleVar = (from, var_str, def_v, is_object = false) => {
      const [v1, v2] = var_str.split('.');
      if (from[v1] === void 0)
        return def_v;
      if (!is_object && typeof from[v1] == 'object') {
        if (v2 === void 0)
          return def_v;
        const t = from[v1][v2];
        return t !== void 0 ? t : def_v;
      }
      return from[v1];
    }

    const checkBaseName = stat => stat.baseName() == this.belongCharacterStat.link;
    const c_stat = simple_stats.find(stat => checkBaseName(stat) && stat.type == StatBase.TYPE_CONSTANT),
      m_stat = simple_stats.find(stat => checkBaseName(stat) && stat.type == StatBase.TYPE_MULTIPLIER),
      t_stat = simple_stats.find(stat => checkBaseName(stat) && stat.type == StatBase.TYPE_TOTAL);
    let cvalue = c_stat ? c_stat.statValue() : 0,
      mvalue = m_stat ? m_stat.statValue() : 0,
      tvalue = t_stat ? t_stat.statValue() : 0;

    let defaultFormula = true;

    const statPartsDetail = {
      additionalValues: {
        constant: [],
        multiplier: [],
        total: [],
        base: []
      },
      initValue: {
        constant: cvalue,
        multiplier: mvalue,
        total: tvalue,
        base: 0
      }
    }

    const handleFormula = f => {
      // console.group('formula: before: ', f);
      f = f
        .replace(/\$([a-zA-Z0-9_.]+)/g, (m, m1) => {
          const a = handleVar(vars.value['$'], m1, null, true);

          return a ? a.result(simple_stats, vars).value.toString() : '0';
        })
        .replace(/@([a-zA-Z0-9_.]+)/g, (m, m1) => {
          return handleVar(vars.value['@'], m1, '0');
        })
        .replace(/#([a-zA-Z0-9_.]+)/g, (m, m1) => {
          if (['cvalue', 'mvalue', 'tvalue'].includes(m1)) {
            defaultFormula = false;
            switch (m1) {
              case 'cvalue':
                return cvalue;
              case 'mvalue':
                return mvalue;
              case 'tvalue':
                return tvalue;
            }
          }
          return handleVar(vars.value['#'], m1, '0');
        });
      // console.log('formula: after: ', f);
      // console.groupEnd();
      return safeEval(f);
    }

    const conditions = this.conditionValues
      .map(p => {
        let statBasePart = null;
        const c = p.conditional
          .replace(/@([a-zA-Z0-9_.]+)/g, (m, m1) => {
            const t = handleVar(vars.conditional['@'], m1, true);
            return t ? 'true' : 'false';
          })
          .replace(/#([a-zA-Z0-9_.]+)/g, (m, m1) => {
            if (statBasePart == null && ['cvalue', 'mvalue', 'tvalue'].includes(m1))
              statBasePart = m1;
            const t = handleVar(vars.conditional['#'], m1, true);
            return t ? 'true' : 'false';
          });
        return {
          conditional: p.conditional,
          result: safeEval(c, true),
          formula: p.formula,
          statBasePart
        };
      })
      .filter(p => p.result)

    conditions.filter(p => p.statBasePart != null).forEach(p => {
      const t = p.statBasePart,
        f = p.formula.replace(/#([a-zA-Z0-9_.]+)/g, '0'); // 不應該有#變數
      const v = handleFormula(f);
      const data = {
        conditional: p.conditional,
        value: v
      };
      switch (t) {
        case 'cvalue':
          cvalue += v;
          statPartsDetail.additionalValues.constant.push(data);
          break;
        case 'mvalue':
          mvalue += v;
          statPartsDetail.additionalValues.multiplier.push(data);
          break;
        case 'tvalue':
          tvalue += v;
          statPartsDetail.additionalValues.total.push(data);
          break;
      }
    });

    const additonal_values = conditions
      .filter(p => p.statBasePart == null)
      .map(p => {
        const v = handleFormula(p.formula);
        statPartsDetail.additionalValues.base.push({
          conditional: p.conditional,
          value: v
        });
        return v;
      });

    const basev = this.formula ? handleFormula(this.formula) : 0;
    const res = [basev, ...additonal_values]
      .reduce((cur, v) => cur + v, 0);

    if (defaultFormula)
      statPartsDetail.initValue['base'] = basev;

    return {
      value: defaultFormula ? (res * (100 + mvalue) / 100 + cvalue) * (100 + tvalue) / 100 : res,
      statValueParts: {
        base: res,
        constant: cvalue,
        multiplier: mvalue,
        total: tvalue
      },
      statPartsDetail
    };
  }
}

export { CharacterStatCategory, CharacterStat, Character, EquipmentField, EquipmentFieldItem };