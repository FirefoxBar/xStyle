import { APIs } from '@/share/core/constant';
import notify from '@/share/core/notify';
import type { FilteredStyles, StyleFilterOption } from '@/share/core/types';

/**
 * Background API封装
 */
class BackgroundAPI {
  openURL(url: string) {
    return notify.background({
      method: APIs.OPEN_URL,
      url,
    });
  }
  setPrefs(key: string, value: any) {
    return notify.background({
      method: APIs.SET_PREFS,
      key,
      value,
    });
  }
  getStyles(filter: StyleFilterOption): Promise<FilteredStyles> {
    return notify.background({
      ...filter,
      method: APIs.GET_STYLES,
    });
  }
}

const Api = new BackgroundAPI();

export default Api;
