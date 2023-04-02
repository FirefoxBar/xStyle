import cssnano from 'cssnano';
import less from 'less';
import { merge } from 'lodash-es';
import postcss from 'postcss';
import sass from 'sass';
import { trimNewLines } from '@/share/core/utils';
import { AdvancedItem, AdvancedItemImageDropdown, AdvancedItemTextColor, BasicStyle, SavedStyle } from '@/share/core/types';
import { isAdvancedItemImageDropdown, isAdvancedItemTextColor } from '@/share/core/type-utils';
import { ADVANCED_TYPE, STYLE_DYNAMIC_TYPE } from '@/share/core/constant';

// Compile dynamic format like less, sass
async function compileDynamic(format: STYLE_DYNAMIC_TYPE, content: string) {
  if (format === STYLE_DYNAMIC_TYPE.LESS) {
    const result = await less.render(content);
    return result.css;
  }

  if (format === STYLE_DYNAMIC_TYPE.SASS) {
    const result = await sass.compileStringAsync(content);
    return result.css;
  }

  return content;
}

// Convect css to a special format for storage
async function minifyCSS(css: string) {
  const result = await postcss([cssnano]).process(css, { from: 'app.css', to: 'app.out.css' });
  return result.css;
}

async function compileCSS(css: string) {
  const root = postcss.parse(css);

  const globalCodes = [];
  const mozCodes = [];
  // find -moz-document nodes
  root.nodes.forEach((node) => {
    if (node.type === 'atrule' && node.name === '-moz-document') {
      // apply to special sites
      if (node.nodes.length === 0) {
        // skip empty node
        return;
      }
      mozCodes.push({
        params: node.params,
        code: css.substring(node.first.source.start.offset, node.last.source.end.offset + 1),
      });
      return;
    }
    // other styles will apply to all websites
    const code = css.substring(node.source.start.offset, node.source.end.offset + 1);
    globalCodes.push(code);
  });

  const sections = [];
  // compile global
  if (globalCodes.length > 0) {
    const code = await minifyCSS(globalCodes.join('\n'));
    if (code.length > 0) {
      sections.push({
        urls: [],
        urlPrefixes: [],
        domains: [],
        regexps: [],
        exclude: [],
        code,
      });
    }
  }

  // compile moz sections
  const tryParseString = (str: string) => {
    try {
      const result = JSON.parse(str);
      if (typeof result === 'string') {
        return result;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };
  for (const moz of mozCodes) {
    const code = await minifyCSS(moz.code);
    if (code.length === 0) {
      continue;
    }
    const section = {
      urls: [],
      urlPrefixes: [],
      domains: [],
      regexps: [],
      exclude: [],
      code,
    };
    const params = moz.params.split(/(url-prefix|domain|regexp|exclude|url\()/);
    const cssToProperty = { url: 'urls', 'url-prefix': 'urlPrefixes', domain: 'domains', regexp: 'regexps', exclude: 'exclude' };
    const matchKeys = ['url-prefix', 'domain', 'regexp', 'exclude', 'url'];
    let previousKey = '';
    let cachedCode = '';
    for (let i = 0; i < params.length; i++) {
      if (matchKeys.includes(params[i])) {
        if (i < params.length - 1 && params[i + 1].startsWith('(') && !cachedCode.startsWith('("')) {
          cachedCode = '';
          previousKey = params[i];
          continue;
        }
      }
      cachedCode += params[i];
      cachedCode = cachedCode.trim().replace(/,$/, '');
      const endIndex = cachedCode.lastIndexOf('")');
      if (cachedCode.startsWith('("') && endIndex !== -1) {
        const item = tryParseString(cachedCode.substring(1, endIndex + 1));
        if (item) {
          cachedCode = '';
          section[cssToProperty[previousKey]].push(item);
        }
      }
    }
    sections.push(section);
  }

  return sections;
}


interface ParsedMeta {
  [x: string]: any;
  advanced: Record<string, AdvancedItem>;
}

function parseStyleMeta(code: string) {
  const alias = { updateURL: 'updateUrl', md5URL: 'md5Url', homepageURL: 'url', originalMD5: 'originalMd5' };

  // replace %22 with "
  function replaceQuote(s: string) {
    return s.replace(/%22/g, '"');
  }

  function getQuotedContentSplitted(s: string, sp: string[]) {
    const start = sp.findIndex((x) => x.startsWith('"'));
    const end = sp.findIndex((x) => x.endsWith('"'));
    if (start === end) {
      return replaceQuote(sp[start]);
    }
    const result = trimNewLines(s.substring(s.indexOf(sp[start]), s.indexOf(sp[end]) + sp[end].length));
    return result.replace(/^"/, '').replace(/"$/, '');
  }

  function getQuotedContent(s: string) {
    const sp = s.split(/[ \t]+/);
    return getQuotedContentSplitted(s, sp);
  }

  // split by @
  const metaStartMark = code.match(/^@(\w+)([ \t]+)/gm);
  const sections: Array<{ name: string; content: string }> = [];
  let lastIndex = 0;
  for (let keyIndex = 0; keyIndex < metaStartMark.length; keyIndex++) {
    const keyText = metaStartMark[keyIndex];
    const index = code.indexOf(keyText, lastIndex);
    const nextIndex = keyIndex === metaStartMark.length - 1 ? code.length : code.indexOf(metaStartMark[keyIndex + 1], index + 1);
    const text = code.substring(index, nextIndex);
    const key = text.match(/@(\w+)([ \t]+)/)[1];
    sections.push({
      name: key,
      content: trimNewLines(text.substring(text.indexOf(key) + key.length)),
    });
    lastIndex = index + 1;
  }

  const result: ParsedMeta = {
    advanced: {},
  };

  for (const section of sections) {
    if (section.name === 'advanced') {
      let advancedCode = section.content;
      const sp = section.content.split(/[ \t]+/);

      const advancedType = sp.shift();
      advancedCode = trimNewLines(advancedCode.substring(advancedCode.indexOf(advancedType) + advancedType.length));

      const advancedKey = sp.shift();
      advancedCode = trimNewLines(advancedCode.substring(advancedCode.indexOf(advancedKey) + advancedKey.length));

      // Get advanced display name
      const advancedName = getQuotedContentSplitted(advancedCode, sp);
      advancedCode = trimNewLines(advancedCode.substring(advancedCode.indexOf(advancedName) + advancedName.length + 1));

      // Now, advancedCode is advanced content
      if (advancedType === ADVANCED_TYPE.TEXT || advancedType === ADVANCED_TYPE.COLOR) {
        // advanced content is default content
        const item: AdvancedItemTextColor = {
          type: advancedType,
          title: advancedName,
          default: advancedCode.replace(/^"/, '').replace(/"$/, ''),
        };
        result.advanced[advancedKey] = item;
        continue;
      }

      if (advancedType === ADVANCED_TYPE.IMAGE || advancedType === ADVANCED_TYPE.DROPDOWN) {
        // advanced content is the image list or dropdown options
        const advancedItem: AdvancedItemImageDropdown = {
          type: advancedType,
          title: advancedName,
          option: {},
        };
        trimNewLines(advancedCode.replace(/^{/, '').replace(/}$/, ''))
          .split('\n\t')
          .forEach((item) => {
            const key = item.substring(0, item.indexOf(' '));
            let rest = item.substring(item.indexOf(key) + key.length).trim();
            const title = getQuotedContent(rest);
            rest = rest.substring(rest.indexOf(title) + title.length + 1).trim();
            let value = '';
            if (advancedType === ADVANCED_TYPE.IMAGE) {
              value = rest.replace(/^"/, '').replace(/"$/, '');
            }
            if (advancedType === ADVANCED_TYPE.DROPDOWN) {
              value = rest.substring(rest.indexOf('<<<EOT'), rest.indexOf(' EOT;'));
            }
            advancedItem.option[key] = {
              title,
              value,
            };
          });
        result.advanced[advancedKey] = advancedItem;
        continue;
      }
    }

    // normal key with alias
    if (typeof alias[section.name] !== 'undefined') {
      result[alias[section.name]] = section.content;
      continue;
    }

    result[section.name] = section.content;
  }

  return result;
}

function applyAdvanced(content: string, advancedItems: Record<string, AdvancedItem>, saved: Record<string, string>) {
  const getValue = (k: string, v: string) => {
    if (typeof advancedItems[k] === 'undefined') {
      return '';
    }

    const item = advancedItems[k];
    if (isAdvancedItemTextColor(item)) {
      return v;
    }
    if (isAdvancedItemImageDropdown(item)) {
      if (item.type === ADVANCED_TYPE.DROPDOWN) {
        return item.option[v].value;
      }
      if (item.type === ADVANCED_TYPE.IMAGE) {
        return typeof item.option[v] === 'undefined' ? v : item.option[v].value;
      }
    }
    return '';
  };
  let isContinue = false;
  const keys = Object.keys(saved);
  do {
    isContinue = false;
    for (const k of keys) {
      const reg = new RegExp(`\\/\\*\\[\\[${k}\\]\\]\\*\\/`, 'g');
      if (reg.test(content)) {
        isContinue = true;
        content = content.replace(reg, getValue(k, saved[k]));
      }
    }
  } while (isContinue);
  return content;
}

// Parse a style file
export async function parseStyleFile(_code: string, options: Partial<BasicStyle> = {}, _advanced: Partial<SavedStyle['advanced']> = {}) {
  const advanced: SavedStyle['advanced'] = merge({
    saved: {},
    item: {},
    css: [],
  }, options.advanced || {}, _advanced);
  const result: BasicStyle = {
    type: STYLE_DYNAMIC_TYPE.CSS,
    lastModified: new Date().getTime(),
    name: '',
    enabled: true,
    updateUrl: '',
    sections: [],
    originalMd5: '',
    ...options,
    advanced,
    code: trimNewLines(_code),
  };

  const getAdvancedSaved = (k: string, item: AdvancedItem) => {
    // init saved
    // 3. if the type of this one is dropdown or image, the first option is used
    if (typeof advanced.saved[k] !== 'undefined') {
      // if the original setting is set, use it
      return advanced.saved[k];
    }
    if (isAdvancedItemTextColor(item)) {
      // if the type is text or color, use "default" field
      return item.default;
    }
    if (isAdvancedItemImageDropdown(item)) {
      // if the type is image or dropdown, use the first option
      return Object.keys(item.option)[0];
    }
  };

  let toCompile = result.code;
  if (result.code.indexOf('/* ==UserStyle==') === 0) {
    // user css file
    const meta = parseStyleMeta(trimNewLines(result.code.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]));
    result.code = trimNewLines(result.code.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
    toCompile = result.code;
    // advanced param is more important than advanced key in style file
    if (
      Object.keys(advanced.item).length === 0 &&
      meta.advanced !== undefined &&
      Object.keys(meta.advanced).length > 0
    ) {
      advanced.item = meta.advanced;
    }

    if (meta.type) {
      result.type = meta.type;
    }
  }

  // Has advanced
  const advancedKeys = Object.keys(advanced.item);
  if (advancedKeys.length > 0) {
    for (const k of advancedKeys) {
      advanced.saved[k] = getAdvancedSaved(k, advanced.item);
    }
    toCompile = applyAdvanced(toCompile, advanced.item, advanced.saved);
  }

  const css = await compileDynamic(result.type, toCompile);
  result.sections = await compileCSS(css);

  return result;
}

export function parseStyleJSON(code: string, options: Partial<BasicStyle> = {}, _advanced: Partial<SavedStyle['advanced']> = {}) {
  const json = JSON.parse(code);
  const advanced: SavedStyle['advanced'] = merge({
    saved: {},
    item: {},
    css: [],
  }, options.advanced || {}, json.advanced || {}, _advanced);
  const result: BasicStyle = {
    type: STYLE_DYNAMIC_TYPE.CSS,
    lastModified: new Date().getTime(),
    name: '',
    enabled: true,
    updateUrl: '',
    code: '',
    sections: [],
    originalMd5: '',
    ...json,
    advanced,
  };

  if (typeof json.code === 'undefined') {
    const sections = json.advanced.css.length > 0 ? json.advanced.css : json.sections;
    const propertyToCss = { urls: 'url', urlPrefixes: 'url-prefix', domains: 'domain', regexps: 'regexp', exclude: 'exclude' };
    result.code = sections.map((section) => {
      let cssMds = [];
      for (const i in propertyToCss) {
        if (section[i]) {
          cssMds = cssMds.concat(section[i].map((v) => {
            return `${propertyToCss[i]}("${v.replace(/\\/g, '\\\\')}")`;
          }));
        }
      }
      return cssMds.length ? `@-moz-document ${cssMds.join(', ')} {\n${section.code}\n}` : section.code;
    }).join('\n\n');
  } else {
    result.code = json.code;
  }

  if (json.advanced.css) {
    delete json.advanced.css;
  }

  return parseStyleFile(result.code, result, result.advanced);
}
