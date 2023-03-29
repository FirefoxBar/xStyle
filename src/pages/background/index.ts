import initApiHandler from './api-handler';
import initAutoUpdater from './auto-updater';
import initMenus from './menus';
import initModifyCSP from './modify-csp';
import './upgrade';
import initUSOHandler from './userstyles-org';
import initWebNavigation from './web-navigation';

if (typeof window !== 'undefined') {
  window.IS_BACKGROUND = true;
}

// 开始初始化
initApiHandler();
initWebNavigation();
initMenus();
initModifyCSP();
initUSOHandler();
initAutoUpdater();
