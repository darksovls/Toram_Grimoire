
import { defineStore } from 'pinia'
import { computed, ComputedRef, readonly, ref } from 'vue'
import type { Ref } from 'vue'

import Grimoire from '@/shared/Grimoire'

import { Character, CharacterSaveData } from '@/lib/Character/Character'
import { CharacterEquipment, EquipmentSaveData } from '@/lib/Character/CharacterEquipment'
import { FoodsSaveData } from '@/lib/Character/Food'

import ExportBuild from '@/setup/ExportBuild'

import { SkillBuildState, useCharacterSkillStore } from './skill'
import { useCharacterFoodStore } from './food'
import { setupCharacterSkills, setupCharacterStats, setupFoodStats } from './setup'
import { SkillBuild, SkillBuildSaveData } from './skill-build/SkillBuild'
import { useCharacterSkillBuildStore } from './skill-build'


interface CharacterStoreSaveSummary {
  characters: string[];
  equipments: {
    numbers: number;
  };
  skillBuilds: string[];
  characterIndex: number;
  skillBuildIndex: number;
  foodBuildIndex: number;
}

export const useCharacterStore = defineStore('view-character', () => {
  const currentCharacterIndex = ref(-1)
  const characterSimulatorHasInit = ref(false)
  const characters: Ref<Character[]> = ref([])
  const equipments: Ref<CharacterEquipment[]> = ref([])
  const autoSaveDisabled = ref(false)

  const skill = useCharacterSkillStore()
  const food = useCharacterFoodStore()
  const skillBuildStore = useCharacterSkillBuildStore()

  const saveDisabled = ref(false)

  const currentCharacter = computed<Character>(() => characters.value[currentCharacterIndex.value])

  const characterSimulatorInitFinished = () => {
    characterSimulatorHasInit.value = true
  }

  const closeAutoSave = () => {
    autoSaveDisabled.value = false
  }

  const reset = () => {
    skill.resetSkillBuilds()
    characters.value = []
    equipments.value = []
    food.resetFoodBuilds()
  }

  const setCurrentCharacter = (idx: number) => {
    currentCharacterIndex.value = idx
  }

  const createCharacter = (chara?: Character) => {
    if (chara) {
      characters.value.push(chara)
    } else {
      characters.value.push(new Character(Grimoire.i18n.t('character-simulator.character')  + ' ' + (characters.value.length + 1)))
    }
    currentCharacterIndex.value = characters.value.length - 1
  }

  const removeCharacter = (idx: number = currentCharacterIndex.value) => {
    characters.value.splice(idx, 1)
    if (currentCharacterIndex.value >= characters.value.length) {
      currentCharacterIndex.value = characters.value.length - 1
    }
  }

  const appendEquipments = (eqs: CharacterEquipment[]) => {
    equipments.value.push(...eqs)
  }

  const removeEquipment = (idx: number) => {
    equipments.value.splice(idx, 1)
  }

  const deleteAllSavedData = () => {
    const prefix = 'app--character-simulator--data-'
    const storage = window.localStorage

    let find = true, cnt = 0
    const list = ['', '--characters', '--equipments', '--skillBuilds', '--skillBuilds-v2', '--foodBuilds']
    while (find) {
      const cur_prefix = prefix + cnt
      const finds = list.filter(p => {
        const item = cur_prefix + p
        if (storage.getItem(item) !== null) {
          // backup[item] = storage.getItem(item);
          storage.removeItem(item)
          return true
        }
        return false
      })
      find = finds.length > 0
      cnt += 1
    }

    saveDisabled.value = true
  }

  interface CharacterSimulatorSaveData {
    characters: CharacterSaveData[];
    equipments: EquipmentSaveData[];
    skillBuilds: SkillBuildSaveData[];
    foodBuilds: FoodsSaveData[];
  }
  const createCharacterSimulatorSaveData = (): CharacterSimulatorSaveData => {
    const charactersData = characters.value.map(item => item.save(equipments.value))
    const equipmentsData = equipments.value.map(item => item.save())
    const skillBuildsData = skillBuildStore.saveSkillBuilds()
    const foodBuildsData = food.foodBuilds.map(item => item.save())

    return {
      characters: charactersData,
      equipments: equipmentsData,
      skillBuilds: skillBuildsData,
      foodBuilds: foodBuildsData,
    }
  }
  const loadCharacterSimulatorSaveData = (saveData: CharacterSimulatorSaveData, { ignoreSkillBuilds = false }: { ignoreSkillBuilds?: boolean } = {}) => {
    const allValidEquipments = saveData.equipments.map(data => {
      const load = CharacterEquipment.loadEquipment(data)
      if (!load.error) {
        return load.equipment
      }
      return null
    }).filter(item => item) as CharacterEquipment[]

    saveData.characters.forEach(charaRow => {
      const chara = new Character()
      const load = chara.load(charaRow, allValidEquipments)
      if (!load.error) {
        createCharacter(chara)
      }
    })

    appendEquipments(allValidEquipments)

    if (!ignoreSkillBuilds) {
      saveData.skillBuilds.forEach(buildData => {
        const build = SkillBuild.load(buildData)
        skillBuildStore.appendSkillBuild(build)
      })
    }

    saveData.foodBuilds.forEach(data => {
      const foods = food.foodsBase!.createFoods()
      const load = foods.load(data)
      if (!load.error)
        food.createFoodBuild({ foodBuild: foods })
    })
  }

  const loadCharacterSimulator = ({ index = 0 }: { index?: number } = {}) => {
    const prefix = 'app--character-simulator--data-' + index
    if (!window.localStorage.getItem(prefix)) {
      console.warn(`Index: ${index} of Character-Simulator Data is not exist.`)
      return
    }
    try {
      reset()

      const summary = JSON.parse(window.localStorage.getItem(prefix)!) as CharacterStoreSaveSummary
      const characterDatas = JSON.parse(window.localStorage.getItem(prefix + '--characters')!) as CharacterSaveData[]
      const equipmentDatas = JSON.parse(window.localStorage.getItem(prefix + '--equipments')!) as EquipmentSaveData[]
      const skillBuildsCsv = window.localStorage.getItem(prefix + '--skillBuilds') ?? null
      const skillBuildsV2OriginalData = window.localStorage.getItem(prefix + '--skillBuilds-v2')
      const skillBuildsV2Data = skillBuildsV2OriginalData ? JSON.parse(skillBuildsV2OriginalData) as SkillBuildSaveData[] : null

      const foodBuildsDataString = window.localStorage.getItem(prefix + '--foodBuilds')
      const foodBuilds = foodBuildsDataString ? JSON.parse(foodBuildsDataString) as FoodsSaveData[] : []

      const loadSkillBuildLagacy = !!skillBuildsV2Data

      loadCharacterSimulatorSaveData({
        characters: characterDatas,
        equipments: equipmentDatas,
        skillBuilds: skillBuildsV2Data ?? [],
        foodBuilds,
      })

      if (loadSkillBuildLagacy && skillBuildsCsv) {
        skill.loadSkillBuildsCsv({ csvString: skillBuildsCsv })
        ;(skill.skillBuilds as SkillBuildState[]).forEach(state => {
          const build = SkillBuild.loadFromLagacy(state)
          skillBuildStore.appendSkillBuild(build)
        })
      }

      // 讀檔過程會改寫index，因此最後設定index
      setCurrentCharacter(summary.characterIndex)
      skillBuildStore.setCurrentSkillBuild(summary.skillBuildIndex)
      food.setCurrentFoodBuild(summary.foodBuildIndex ?? -1)
    } catch (error) {
      reset()
      createCharacter()
      closeAutoSave()
      console.warn('Error when load Character-Simulator data.')
      throw error
    }
  }

  /**
   * @param index - 0: auto save
   */
  const saveCharacterSimulator = (index: number = 0) => {
    if (saveDisabled.value) {
      return
    }
    const {
      characters: charactersData,
      equipments: equipmentsData,
      skillBuilds: skillBuildsData,
      foodBuilds: foodBuildsData,
    } = createCharacterSimulatorSaveData()

    const prefix = 'app--character-simulator--data-' + index
    // if (index === -1) {
    //   let cnt = 0
    //   while (window.localStorage.getItem(prefix + cnt)) {
    //     cnt += 1
    //   }
    //   prefix = prefix + cnt
    // }
    // else {
    //   prefix = prefix + index
    // }

    const summary: CharacterStoreSaveSummary = {
      characters: characters.value.map(item => item.name),
      equipments: {
        numbers: equipments.value.length,
      },
      skillBuilds: skill.skillBuilds.map(p => p.name),
      characterIndex: currentCharacterIndex.value,
      skillBuildIndex: skillBuildStore.currentSkillBuildIndex,
      foodBuildIndex: food.currentFoodBuildIndex,
    }

    const originalData = {
      summary: window.localStorage.getItem(prefix) ?? '',
      '--characters': window.localStorage.getItem(prefix + '--characters') ?? '',
      '--equipments': window.localStorage.getItem(prefix + '--equipments') ?? '',
      '--skillBuilds-v2': window.localStorage.getItem(prefix + '--skillBuilds-v2') ?? '',
      '--foodBuilds': window.localStorage.getItem(prefix + '--foodBuilds') ?? '',
    }
    try {
      window.localStorage.setItem(prefix, JSON.stringify(summary))
      window.localStorage.setItem(prefix + '--characters', JSON.stringify(charactersData))
      window.localStorage.setItem(prefix + '--equipments', JSON.stringify(equipmentsData))
      window.localStorage.setItem(prefix + '--skillBuilds-v2', JSON.stringify(skillBuildsData))
      window.localStorage.setItem(prefix + '--foodBuilds', JSON.stringify(foodBuildsData))
    } catch (err) {
      console.warn('[character-simulator] Unknown error when save datas')
      console.warn(err)
      window.localStorage.setItem(prefix, originalData.summary)
      window.localStorage.setItem(prefix + '--characters', originalData['--characters'])
      window.localStorage.setItem(prefix + '--equipments', originalData['--equipments'])
      window.localStorage.setItem(prefix + '--skillBuilds-v2', originalData['--skillBuilds-v2'])
      window.localStorage.setItem(prefix + '--foodBuilds', originalData['--foodBuilds'])
    }
  }

  const {
    exportBuild: exportCharacterSimulator,
    importBuild: importCharacterSimulator,
  } = ExportBuild({
    save(handler) {
      const data = createCharacterSimulatorSaveData()
      handler('cy-grimoire-character-simulator.txt', JSON.stringify(data))
    },
    loaded(res) {
      const saveData = JSON.parse(res) as CharacterSimulatorSaveData
      loadCharacterSimulatorSaveData(saveData)
    },
  })

  const {
    activeSkillResultStates,
    passiveSkillResultStates,
    allValidSkillsStats,
    getSkillBranchItemState,
  } = setupCharacterSkills(currentCharacter, computed(() => skillBuildStore.currentSkillBuild) as ComputedRef<SkillBuild | null>)

  const { allFoodBuildStats } = setupFoodStats(computed(() => food.currentFoodBuild))

  const { characterStatCategoryResults } = setupCharacterStats(currentCharacter, allValidSkillsStats, allFoodBuildStats)

  const setupCharacterComparedStatCategoryResults = (comparedCharacter: Ref<Character | null>) => {
    const { characterStatCategoryResults: comparedCharacterStatCategoryResults } = setupCharacterStats(comparedCharacter, allValidSkillsStats, allFoodBuildStats)
    return {
      comparedCharacterStatCategoryResults,
    }
  }

  return {
    characters,
    equipments,
    currentCharacter,
    currentCharacterIndex,
    characterSimulatorHasInit: readonly(characterSimulatorHasInit),

    autoSaveDisabled: readonly(autoSaveDisabled),
    characterSimulatorInitFinished,

    characterStatCategoryResults,
    setupCharacterComparedStatCategoryResults,

    activeSkillResultStates,
    passiveSkillResultStates,
    getSkillBranchItemState,

    reset,
    setCurrentCharacter,
    createCharacter,
    removeCharacter,
    appendEquipments,
    removeEquipment,

    deleteAllSavedData,
    loadCharacterSimulator,
    saveCharacterSimulator,
    exportCharacterSimulator,
    importCharacterSimulator,
  }
})
