export interface StyleFilterOption {
  url?: string;
  id?: number;
  matchUrl?: string;
  enabled?: boolean;
  asHash?: boolean;
}


export interface StyleSection {
  urls: string[];
  domains: string[];
  regexps: string[];
  urlPrefixes: string[];
  exclude: string[];
  code: string;
}

export interface BasicStyle {
  type: 'css' | 'less' | 'sass';
  advanced: {
    // TODO
    item: any;
    saved: any;
    css?: string[];
  };
  code: string;
  enabled: boolean;
  lastModified: number;
  md5Url?: string;
  name: string;
  originalMd5: string;
  sections: StyleSection[];
  updateUrl?: string;
  url?: string;
}

export interface SavedStyle extends BasicStyle {
  id: number;
  autoUpdate?: boolean;
}


// navigator.appVersion.indexOf("Windows") > 0 ? "sublime" : "default",
export interface PrefValue {
  'show-badge': boolean; // display text on popup menu icon
  'modify-csp': boolean; // modify csp
  'auto-update': boolean; // Auto update styles
  'disableAll': boolean; // boss key
  'compact-popup': boolean;
  'only-applies-html': boolean;

  'manage.sort': string; // sort styles in management page

  'editor.initAdvanced': number;
  'editor.options': any; // CodeMirror.defaults.*
  'editor.lineWrapping': boolean; // word wrap
  'editor.smartIndent': boolean; // "smart" indent
  'editor.indentWithTabs': boolean; // smart indent with tabs
  'editor.tabSize': number; // tab width, in spaces
  'editor.keyMap': string;
  'editor.theme': 'default'; // CSS theme
  'editor.beautify': { // CSS beautifier{
    'indent_size': number;
    'indent_char': string;
    'space_around_selector_separator': boolean;
    'selector_separator_newline': boolean;
    'end_with_newline': boolean;
    'newline_between_rules': boolean;
  };
  'editor.lintDelay': number; // lint gutter marker update delay, ms
  'editor.lintReportDelay': number; // lint report update delay, ms
  'editor.fontSize': number; // font size
  'editor.fontName': string; // font size
  'editor.gt.port': number; // GhostText port
}
