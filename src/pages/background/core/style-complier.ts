import { BasicStyle, SavedStyle } from '@/share/core/types';
import { trimNewLines } from '@/share/core/utils';

// Parse a style file
function parseStyleFile(_code: string, options: Partial<BasicStyle> = {}, _advanced: Partial<SavedStyle['advanced']> = {}) {
  const advanced = options.advanced || _advanced || {};
  const { item = {} } = advanced;
  const result: BasicStyle = {
    advanced: {
      item: {},
      saved: {},
    },
    type: 'css',
    lastModified: new Date().getTime(),
    name: '',
    enabled: true,
    updateUrl: '',
    code: '',
    sections: null,
    originalMd5: '',
  };


  const code = trimNewLines(_code);

  return new Promise((resolve, reject) => {
    // const finishParse = () => {
    // 	for (const k in options) {
    // 		if (typeof(options[k]) === 'object') {
    // 			if (typeof(result[k]) === 'undefined') {
    // 				result[k] = {};
    // 			}
    // 			for (const kk in options[k]) {
    // 				result[k][kk] = options[k][kk];
    // 			}
    // 		} else {
    // 			result[k] = options[k];
    // 		}
    // 	}
    // 	result.advanced = advanced;
    // 	resolve(result);
    // };
    const getAdvancedSaved = (k, items) => {
      // init saved
      // 1. if the original style is set, the original setting is used
      // 2. if the type of this one is text or color, the default is used
      // 3. if the type of this one is dropdown or image, the first option is used
      return (typeof (advanced.saved[k]) !== 'undefined' ?
        advanced.saved[k] :
        (typeof (items[k].default) === 'undefined' ?
          Object.keys(items[k].option)[0] :
          items[k].default
        )
      );
    };
    code = trimNewLines(code);
    if (code.indexOf('/* ==UserStyle==') === 0) {
      // user css file
      const meta = parseStyleMeta(trimNewLines(code.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]));
      let body = trimNewLines(code.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
      result.code = body;
      // advanced param is more important than advanced key in json file
      if (Object.keys(advanced.item).length === 0 &&
				meta.advanced !== undefined &&
				Object.keys(meta.advanced).length > 0) {
        advanced.item = meta.advanced;
      }
      // Advanced
      if (Object.keys(advanced.item).length > 0) {
        for (const k in advanced.item) {
          advanced.saved[k] = getAdvancedSaved(k, advanced.item);
        }
        body = applyAdvanced(body, advanced.item, advanced.saved);
      }
      CompileDynamic(meta.type, body).then((css) => {
        CompileCSS(css).then((sections) => {
          result.sections = sections;
          finishParse();
        });
      }).catch((e) => {
        reject(`Error: ${e.message}\nAt line ${e.line} column ${e.column}`);
      });
    } else {
      // json file or normal css file
      let json = null;
      try {
        json = JSON.parse(code);
      } catch (e) {
        // normal css file, check if advanced is passed
        result.code = code;
        let body = code;
        if (Object.keys(advanced.item).length > 0) {
          if (Object.keys(advanced.saved).length === 0) {
            for (const k in advanced.item) {
              advanced.saved[k] = getAdvancedSaved(k, advanced.item);
            }
          }
          body = applyAdvanced(body, advanced.item, advanced.saved);
        }
        CompileCSS(body).then((sections) => {
          result.sections = sections;
          finishParse();
        });
        return;
      }
      // json file, continue
      result.name = json.name;
      result.updateUrl = json.updateUrl || '';
      result.code = typeof (json.code) === 'undefined' ? ((codeSections) => {
        return codeSections.map((section) => {
          let cssMds = [];
          for (var i in propertyToCss) {
            if (section[i]) {
              cssMds = cssMds.concat(section[i].map((v) => {
                return `${propertyToCss[i]}("${v.replace(/\\/g, '\\\\')}")`;
              }));
            }
          }
          return cssMds.length ? `@-moz-document ${cssMds.join(', ')} {\n${section.code}\n}` : section.code;
        }).join('\n\n');
      })(json.advanced.css.length > 0 ? json.advanced.css : json.sections) : json.code;
      let body = result.code;
      if (json.advanced.css) {
        delete json.advanced.css;
      }
      // advanced param is more important than advanced key in json file
      if (Object.keys(advanced.item).length === 0 &&
				json.advanced !== undefined &&
				json.advanced.item !== undefined &&
				Object.keys(json.advanced.item).length > 0) {
        advanced.item = json.advanced.item;
      }
      if (Object.keys(advanced.saved).length === 0 &&
				json.advanced !== undefined &&
				json.advanced.saved !== undefined &&
				Object.keys(json.advanced.saved).length > 0) {
        advanced.saved = json.advanced.saved;
      }
      // If this style have advanced options
      if (Object.keys(advanced.item).length > 0) {
        if (Object.keys(advanced.saved).length === 0) {
          // If not have saved, generate it
          for (const k in advanced.item) {
            advanced.saved[k] = getAdvancedSaved(k, advanced.item);
          }
        }
        body = applyAdvanced(body, advanced.item, advanced.saved);
      }
      CompileDynamic(json.type, body).then((css) => {
        CompileCSS(css).then((sections) => {
          result.sections = sections;
          finishParse();
        });
      }).catch((e) => {
        reject(`Error: ${e.message}\nAt line ${e.line} column ${e.column}`);
      });
    }
  });
}
