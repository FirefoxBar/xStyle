import { ADVANCED_TYPE } from './constant';
import type { AdvancedItemImageDropdown, AdvancedItemTextColor } from './types';

export const isAdvancedItemTextColor = (obj: any): obj is AdvancedItemTextColor => {
  return obj.type === ADVANCED_TYPE.TEXT || obj.type === ADVANCED_TYPE.COLOR;
};
export const isAdvancedItemImageDropdown = (obj: any): obj is AdvancedItemImageDropdown => {
  return obj.type === ADVANCED_TYPE.IMAGE || obj.type === ADVANCED_TYPE.DROPDOWN;
};
