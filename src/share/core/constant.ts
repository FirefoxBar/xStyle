import { PrefValue } from './types';

export const defaultPrefValue: PrefValue = {
  'show-badge': true, // display text on popup menu icon
  'modify-csp': true, // modify csp
  'auto-update': false, // Auto update styles
  disableAll: false, // boss key
  'compact-popup': false,
  'only-applies-html': false,

  'manage.sort': 'id', // sort styles in management page

  'editor.initAdvanced': 20,
  'editor.options': {}, // CodeMirror.defaults.*
  'editor.lineWrapping': true, // word wrap
  'editor.smartIndent': true, // "smart" indent
  'editor.indentWithTabs': false, // smart indent with tabs
  'editor.tabSize': 4, // tab width, in spaces
  'editor.keyMap':
      navigator.appVersion.indexOf('Windows') > 0 ? 'sublime' : 'default',
  'editor.theme': 'default', // CSS theme
  'editor.beautify': { // CSS beautifier{
    indent_size: 1,
    indent_char: '\t',
    space_around_selector_separator: true,
    selector_separator_newline: true,
    end_with_newline: false,
    newline_between_rules: true,
  },
  'editor.lintDelay': 500, // lint gutter marker update delay, ms
  'editor.lintReportDelay': 2000, // lint report update delay, ms
  'editor.fontSize': 16, // font size
  'editor.fontName': 'sans-serif', // font size
  'editor.gt.port': 4001, // GhostText port
};

export enum APIs {
  HEALTH_CHECK = 'check',
  OPEN_URL = 'open_url',
  GET_STYLES = 'get_styles',
  PARSE_STYLE = 'parse_style',
  SAVE_STYLE = 'save_style',
  INSTALL_STYLE = 'install_style',
  UPDATE_CACHE = 'update_cache',
  SET_PREFS = 'set_pref',
  ON_EVENT = 'event',

  // 这些是发给页面的
  STYLE_REPLACE_ALL = 'style_replace_all',
  STYLE_APPLY = 'style_apply',
}

export enum EVENTs {
  STYLE_ADDED = 'style_added',
  STYLE_UPDATED = 'style_updated',
  STYLE_DELETED = 'style_deleted',
  CLOUD_LOGIN = 'cloud_login',
}

export enum PARSE_STYLE_FORMAT {
  JSON = 'json',
  CSS = 'css',
}

export const propertyToCss = { urls: 'url', urlPrefixes: 'url-prefix', domains: 'domain', regexps: 'regexp', exclude: 'exclude' };
export const cssToProperty = { url: 'urls', 'url-prefix': 'urlPrefixes', domain: 'domains', regexp: 'regexps', exclude: 'exclude' };

export enum ADVANCED_TYPE {
  TEXT = 'text',
  COLOR = 'color',
  IMAGE = 'image',
  DROPDOWN = 'dropdown',
}

export enum STYLE_DYNAMIC_TYPE {
  CSS = 'css',
  LESS = 'less',
  SASS = 'sass',
}
