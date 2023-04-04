import { Nav } from '@douyinfe/semi-ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { IconFolderOpen, IconHelpCircle, IconMenu, IconSetting } from '@douyinfe/semi-icons';
import { useGetState, useResponsive } from 'ahooks';
import { t } from '@/share/core/utils';
import { prefs } from '@/share/core/prefs';
import SemiLocale from '@/share/components/semi-locale';
import isDarkMode from '@/share/pages/is-dark-mode';
import type { SavedStyle } from '@/share/core/types';
import Styles from './sections/styles';
import type { OnSelectedData } from '@douyinfe/semi-ui/lib/es/navigation';

const Options = () => {
  const [editShow, setEditShow] = useState(false);
  const [editRule, setEditRule] = useState<SavedStyle>();
  const [navCollapse, setNavCollapse, getNavCollapse] = useGetState(false);
  const [active, setActive, getActive] = useGetState('styles');
  // 保存切换到帮助前是否为展开状态
  const isCollapsedRef = useRef(true);

  const responsive = useResponsive();

  useEffect(() => {
    prefs.ready(() => {
      if (isDarkMode()) {
        document.body.setAttribute('theme-mode', 'dark');
      }
    });
  }, []);

  const handleSwitch = useCallback((data: OnSelectedData) => {
    const newActive = data.itemKey as string;
    if (newActive && newActive !== getActive()) {
      if (newActive === 'help') {
        isCollapsedRef.current = getNavCollapse();
      }
      if (getActive() === 'help') {
        setNavCollapse(isCollapsedRef.current);
      } else {
        setNavCollapse(getNavCollapse() || newActive === 'help');
      }
      setActive(newActive);
      window.scrollTo(0, 0);
    }
  }, []);

  const handleEditClose = useCallback(() => {
    setEditShow(false);
    setEditRule(undefined);
  }, []);

  const handleEdit = useCallback((style?: SavedStyle) => {
    setEditShow(true);
    setEditRule(style);
  }, []);

  useEffect(() => {
    // 小屏幕主动收起侧边栏
    if (!responsive.lg && getNavCollapse()) {
      setNavCollapse(false);
    }
  }, [responsive.lg]);

  return (
    <SemiLocale>
      <div
        className={css`
          display: flex;
          flex-direction: row;
          height: 100vh;

          > .navbar {
            flex-grow: 0;
            flex-shrink: 0;
            height: 100vh;
          }

          > .main-content {
            flex-grow: 1;
            flex-shrink: 1;
            height: 100vh;
            overflow: auto;
            box-sizing: border-box;
            padding: 16px;
            background-color: var(--semi-color-fill-0);

            > .in-visible {
              display: none;
            }

            > section {
              > .semi-card {
                margin-bottom: 16px;
              }
            }
          }
        `}
      >
        <Nav
          className="navbar semi-always-dark"
          selectedKeys={[active]}
          onSelect={handleSwitch}
          items={[
            { itemKey: 'styles', text: t('styles'), icon: <IconMenu /> },
            { itemKey: 'options', text: t('optionsHeading'), icon: <IconSetting /> },
            { itemKey: 'export_and_import', text: t('exportAndImport'), icon: <IconFolderOpen /> },
            { itemKey: 'help', text: t('help'), icon: <IconHelpCircle /> },
          ]}
          isCollapsed={navCollapse}
          onCollapseChange={setNavCollapse}
          footer={{
            collapseButton: true,
          }}
        />
        <main className="main-content">
          <Styles visible={active === 'styles'} />
          {active === 'help' && (
            <div
              className={css`
                width: 100%;
                height: 100%;

                > iframe {
                  border: 0;
                  width: 100%;
                  height: 100%;
                }
              `}
            >
              <iframe src="https://github.com/FirefoxBar/xStyle/wiki" />
            </div>
          )}
        </main>
        {/* <Edit visible={editShow} rule={editRule} onClose={handleEditClose} /> */}
      </div>
    </SemiLocale>
  );
};

export default Options;
