import { APIs, PARSE_STYLE_FORMAT } from '@/share/core/constant';
import notify from '@/share/core/notify';
import type { BasicStyle, FilteredStyles, SavedStyle, StyleFilterOption } from '@/share/core/types';

/**
 * Background API封装
 */
const Api = {
  openURL(url: string) {
    return notify.background({
      method: APIs.OPEN_URL,
      url,
    });
  },
  setPrefs(key: string, value: any) {
    return notify.background({
      method: APIs.SET_PREFS,
      key,
      value,
    });
  },
  getStyles(filter: StyleFilterOption): Promise<FilteredStyles> {
    return notify.background({
      ...filter,
      method: APIs.GET_STYLES,
    });
  },
  parseStyle(
    format: PARSE_STYLE_FORMAT,
    code: string,
    options?: Partial<BasicStyle>,
    advanced?: Partial<SavedStyle['advanced']>,
  ): Promise<BasicStyle> {
    return notify.background({
      format,
      code,
      options,
      advanced,
      method: APIs.PARSE_STYLE,
    });
  },
};

export default Api;
