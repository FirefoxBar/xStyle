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
  type: 'css' | 'less';
  advanced: {
    // TODO
    item: any;
    saved: any;
    css?: string[];
  };
  code: string;
  enabled: boolean;
  lastModified: number;
  md5Url: string;
  name: string;
  originalMd5: string;
  sections: StyleSection[];
  updateUrl?: string;
  url?: string;
}

export interface SavedStyle extends BasicStyle {
  id: number;
}


export interface PrefValue {
  [key: string]: any;
}
