import browser from 'webextension-polyfill';
import { APIs, EVENTs } from '@/share/core/constant';
import notify from '@/share/core/notify';
import { prefs } from '@/share/core/prefs';
import { FilteredStyles, SavedStyle } from '@/share/core/types';
import Api from '@/share/pages/api';

const pref = {
  disableAll: false,
  onlyHtml: false,
};
function setPrefs(name, to) {
  if (to === pref[name]) {
    return;
  }
  pref[name] = to;
  if (name === 'disableAll') {
    disableAll(to);
  }
}
let styleElements: Record<string, HTMLElement> = {};
type IFrameObserver = MutationObserver & {
  start: () => void;
};
let iframeObserver: IFrameObserver;

function disableAll(to: boolean) {
  iframeObserver.disconnect();

  disableSheets(to, document);

  if (!to && document.readyState != 'loading') {
    iframeObserver.start();
  }

  function disableSheets(disable: boolean, doc: Document) {
    Array.prototype.forEach.call(doc.styleSheets, (stylesheet: CSSStyleSheet) => {
      if ((stylesheet.ownerNode as HTMLElement).classList.contains('xstyle')) {
        stylesheet.disabled = disable;
      }
    });
    getDynamicIFrames(doc).forEach((iframe) => {
      if (!disable) {
        // update the IFRAME if it was created while the observer was disconnected
        addDocumentStylesToIFrame(iframe);
      }
      disableSheets(disable, iframe.contentDocument);
    });
  }
}

function iframeIsDynamic(f: HTMLIFrameElement) {
  let href = '';
  try {
    href = f.contentDocument.location.href;
  } catch (ex) {
    // Cross-origin, so it's not a dynamic iframe
    return false;
  }
  return href === document.location.href || href.indexOf('about:') === 0;
}
// Only dynamic iframes get the parent document's styles. Other ones should get styles based on their own URLs.
function getDynamicIFrames(doc: Document): HTMLIFrameElement[] {
  return Array.prototype.filter.call(doc.getElementsByTagName('iframe'), iframeIsDynamic);
}

const retiredStyleIds = [];
// to avoid page flicker when the style is updated
// instead of removing it immediately we rename its ID and queue it
// to be deleted in applyStyles after a new version is fetched and applied
function retireStyle(id: string, doc?: Document) {
  const deadID = `ghost-${id}`;
  if (!doc) {
    doc = document;
    retiredStyleIds.push(deadID);
    delete styleElements[`xstyle-${id}`];
    // in case something went wrong and new style was never applied
    setTimeout(removeStyle.bind(null, deadID, doc), 1000);
  }
  const e = doc.getElementById(`xstyle-${id}`);
  if (e) {
    e.id = `xstyle-${deadID}`;
  }
  getDynamicIFrames(doc).forEach((iframe) => retireStyle(id, iframe.contentDocument));
}

function removeStyle(id: string, doc: Document) {
  const e = doc.getElementById(`xstyle-${id}`);
  delete styleElements[`xstyle-${id}`];
  if (e) {
    e.remove();
  }
  if (doc == document && Object.keys(styleElements).length == 0) {
    iframeObserver.disconnect();
  }
  getDynamicIFrames(doc).forEach((iframe) => removeStyle(id, iframe.contentDocument));
}

function replaceAll(newStyles: FilteredStyles, doc: Document, pass2 = false) {
  const oldStyles: HTMLStyleElement[] = Array.prototype.slice.call(doc.querySelectorAll(`STYLE.xstyle${pass2 ? "[id$='-ghost']" : ''}`));
  if (!pass2) {
    oldStyles.forEach((style) => style.id += '-ghost');
  }
  getDynamicIFrames(doc).forEach((iframe) => replaceAll(newStyles, iframe.contentDocument, pass2));
  if (doc == document && !pass2) {
    styleElements = {};
    applyStyles(newStyles);
    replaceAll(newStyles, doc, true);
  }
  if (pass2) {
    oldStyles.forEach((style) => style.remove());
  }
}

function applyStyles(styles: FilteredStyles) {
  if (!styles) {
    // Browser is starting up
    requestStyles();
    return;
  }
  for (const styleId in styles) {
    applySections(styleId, styles[styleId]);
  }

  if (Object.keys(styleElements).length) {
    initBodyObserver();
  }

  if (retiredStyleIds.length) {
    setTimeout(() => {
      while (retiredStyleIds.length) {
        removeStyle(retiredStyleIds.shift(), document);
      }
    }, 0);
  }
}

function applySections(styleId: string, sections: SavedStyle['sections']) {
  let styleElement = document.getElementById(`xstyle-${styleId}`);
  // Already there.
  if (styleElement) {
    return;
  }
  if (pref.onlyHtml) {
    if (document.documentElement.tagName === 'HTML') {
      styleElement = document.createElement('style');
    } else {
      return;
    }
  } else if (document.documentElement instanceof SVGSVGElement) {
    // SVG document, make an SVG style element.
    styleElement = document.createElementNS('https://www.w3.org/2000/svg', 'style') as HTMLElement;
  } else {
    // This will make an HTML style element. If there's SVG embedded in an HTML document, this works on the SVG too.
    styleElement = document.createElement('style');
  }
  styleElement.setAttribute('id', `xstyle-${styleId}`);
  styleElement.setAttribute('class', 'xstyle');
  styleElement.setAttribute('type', 'text/css');
  styleElement.appendChild(document.createTextNode(sections.map((section) => {
    return section.code;
  }).join('\n')));
  addStyleElement(styleElement, document);
  styleElements[styleElement.id] = styleElement;
}

function addStyleElement(styleElement: HTMLElement, doc: Document) {
  if (!doc.documentElement || doc.getElementById(styleElement.id)) {
    return;
  }
  const node = doc.importNode(styleElement, true) as HTMLStyleElement;
  doc.documentElement.appendChild(node);
  node.sheet.disabled = pref.disableAll;
  getDynamicIFrames(doc).forEach((iframe) => {
    if (iframeIsLoadingSrcDoc(iframe)) {
      addStyleToIFrameSrcDoc(iframe, styleElement);
    } else {
      addStyleElement(styleElement, iframe.contentDocument);
    }
  });
}

function addDocumentStylesToIFrame(iframe: HTMLIFrameElement) {
  for (const id in styleElements) {
    if (iframeIsLoadingSrcDoc(iframe)) {
      addStyleToIFrameSrcDoc(iframe, styleElements[id]);
    } else {
      addStyleElement(styleElements[id], iframe.contentDocument);
    }
  }
}

function addDocumentStylesToAllIFrames() {
  getDynamicIFrames(document).forEach(addDocumentStylesToIFrame);
}

function iframeIsLoadingSrcDoc(f: HTMLIFrameElement) {
  return f.srcdoc && f.contentDocument.all.length <= 3;
  // 3 nodes or less in total (html, head, body) == new empty iframe about to be overwritten by its 'srcdoc'
}

function addStyleToIFrameSrcDoc(iframe: HTMLIFrameElement, styleElement: HTMLElement) {
  if (pref.disableAll) {
    return;
  }
  iframe.srcdoc += styleElement.outerHTML;
  // make sure the style is added in case srcdoc was malformed
  setTimeout(addStyleElement.bind(null, styleElement, iframe.contentDocument), 100);
}

let bodyObserver: MutationObserver = null;
function initBodyObserver() {
  if (bodyObserver) {
    return;
  }
  // move all style elements after body
  bodyObserver = new MutationObserver(() => {
    if (document.body) {
      let lastEl = document.body;
      for (const id in styleElements) {
        const s = document.getElementById(id) as HTMLStyleElement;
        if (s.previousElementSibling !== lastEl) {
          lastEl.parentElement.insertBefore(s, lastEl.nextSibling);
          lastEl = s;
          s.sheet.disabled = pref.disableAll;
        } else {
          break;
        }
      }
      bodyObserver.disconnect();
      bodyObserver = null;
    }
  });
  bodyObserver.observe(document.documentElement, { childList: true });
}

// Observe dynamic IFRAMEs being added
function initObserver() {
  iframeObserver = new MutationObserver((mutations) => {
    if (mutations.length > 1000) {
      // use a much faster method for very complex pages with 100,000 mutations
      // (observer usually receives 1k-10k mutations per call)
      addDocumentStylesToAllIFrames();
      return;
    }
    // move the check out of current execution context
    // because some same-domain (!) iframes fail to load when their "contentDocument" is accessed (!)
    // namely gmail's old chat iframe talkgadget.google.com
    setTimeout(process.bind(null, mutations), 0);
  }) as IFrameObserver;

  iframeObserver.start = () => {
    // will be ignored by browser if already observing
    iframeObserver.observe(document, { childList: true, subtree: true });
  };

  function process(mutations: MutationRecord[]) {
    for (let m = 0, ml = mutations.length; m < ml; m++) {
      const mutation = mutations[m];
      if (mutation.type === 'childList') {
        for (let n = 0, nodes = mutation.addedNodes, nl = nodes.length; n < nl; n++) {
          const node = nodes[n] as HTMLIFrameElement;
          if (node.localName === 'iframe' && iframeIsDynamic(node)) {
            addDocumentStylesToIFrame(node);
          }
        }
      }
    }
  }
}

function initListener() {
  notify.event.on(EVENTs.STYLE_ADDED, async (request: any) => {
    if (request.style.enabled) {
      const styles = await Api.getStyles({
        matchUrl: location.href,
        enabled: true,
        id: request.style.id,
      });
      applyStyles(styles);
    }
  });

  notify.event.on(EVENTs.STYLE_DELETED, (request: any) => {
    removeStyle(request.id, document);
  });

  notify.event.on(EVENTs.STYLE_UPDATED, (request: any) => {
    if (request.style.enabled) {
      retireStyle(request.style.id);
      // fallthrough to "styleAdded"
    } else {
      removeStyle(request.style.id, document);
    }
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Also handle special request just for the pop-up
    switch (request.method) {
      case APIs.STYLE_APPLY:
        applyStyles(request.styles);
        break;
      case APIs.STYLE_REPLACE_ALL:
        replaceAll(request.styles, document);
        break;
    }
  });
}
function requestStyles() {
  prefs.ready(() => {
    setPrefs('onlyHtml', prefs.get('only-applies-html'));
    setPrefs('disableAll', prefs.get('disableAll'));

    initListener();
    initObserver();

    Api.getStyles({
      matchUrl: location.href,
      enabled: true,
    }).then(applyStyles);
  });
}

requestStyles();
