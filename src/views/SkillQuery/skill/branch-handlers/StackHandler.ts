import Grimoire from '@/shared/Grimoire'

import { SkillBranchItem } from '@/lib/Skill/SkillComputingContainer'
import { SkillBranchNames } from '@/lib/Skill/Skill/enums'

import { cloneBranchProps, handleDisplayData, HandleDisplayDataOptionFilters } from './utils'
import MapContainer from './utils/MapContainer'

export default function StackHandler<BranchItem extends SkillBranchItem>(branchItem: BranchItem) {
  const { t } = Grimoire.i18n

  const idx = branchItem.parent.branchItems
    .filter(item => item.is(SkillBranchNames.Stack))
    .indexOf(branchItem)
  const props = cloneBranchProps(branchItem, {
    name: value => value === 'auto' ? t('skill-query.branch.stack.base-name') + (idx + 1).toString() : value,
  })

  if (props['default'] === 'auto') {
    props['default'] = props['min']
  }
  const filters = new MapContainer<HandleDisplayDataOptionFilters>({
    max: value => !!value,
  })
  const pureValues = ['min', 'max', 'default', 'step']
  const pureDatas = ['name', 'unit']

  const displayData = handleDisplayData(branchItem, props, {
    filters: filters.value,
    pureValues,
    pureDatas,
  })

  const tmpv = parseInt(displayData.get('max') || displayData.get('default'), 10)
  if (!Number.isNaN(tmpv) && tmpv > 999) {
    displayData.setCustomData('stackInputWidth', '3rem')
  }

  return displayData
}
