import { PrefValue } from './types';

export const defaultPrefValue: PrefValue = {
};

export enum APIs {
  HEALTH_CHECK = 'check',
  OPEN_URL = 'open_url',
  GET_STYLES = 'get_styles',
  SAVE_STYLE = 'save_style',
  INSTALL_STYLE = 'install_style',
  UPDATE_CACHE = 'update_cache',
  SET_PREFS = 'set_pref',
  ON_EVENT = 'event',
}

export enum EVENTs {
  STYLE_ADDED = 'style_added',
  STYLE_DELETED = 'style_deleted',
}

export const propertyToCss = { urls: 'url', urlPrefixes: 'url-prefix', domains: 'domain', regexps: 'regexp', exclude: 'exclude' };
export const cssToProperty = { url: 'urls', 'url-prefix': 'urlPrefixes', domain: 'domains', regexp: 'regexps', exclude: 'exclude' };
