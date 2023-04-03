import { IconEdit, IconPlus, IconSearch, IconSetting } from '@douyinfe/semi-icons';
import { Button, Nav, Switch, Table, Tooltip } from '@douyinfe/semi-ui';
import { css, cx } from '@emotion/css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SemiLocale from '@/share/components/semi-locale';
import emitter from '@/share/core/emitter';
import { prefs } from '@/share/core/prefs';
import { SavedStyle } from '@/share/core/types';
import { IS_ANDROID, canStyle, getActiveTab, getDomains, t } from '@/share/core/utils';
import Api from '@/share/pages/api';
import isDarkMode from '@/share/pages/is-dark-mode';
import IconBrush from '@/share/components/icon-brush';
import { openOption } from './utils';
import type { NavItems, OnSelectedData } from '@douyinfe/semi-ui/lib/es/navigation';

const basicStyle = css`
  min-width: 340px;
  min-height: 440px;
  height: 100vh;
  width: 100vw;
  justify-content: stretch;
  display: flex;
  flex-direction: row;

  > .navbar {
    flex-grow: 0;
    flex-shrink: 0;
  }

  > .main-content {
    flex-grow: 1;
    flex-shrink: 1;
    overflow: auto;
    background-color: var(--semi-color-fill-0);
    display: flex;
    flex-direction: column;

    .cell-enable {
      padding-right: 0;
      .switch-container {
        display: flex;
        align-items: center;
      }
    }

    .cell-action {
      padding-top: 2px !important;
      padding-bottom: 2px !important;
    }
  }
`;

const mobileStyle = css`
  min-height: auto;
  min-width: auto;
  min-width: auto;
  max-width: auto;
`;


const searchOptions = [
  {
    itemKey: 'search-userstyles',
    text: 'userstyles.org',
    url: 'https://userstyles.org/styles/browse/all/%s',
  },
  {
    itemKey: 'search-freestyler',
    text: 'freestyler.ws',
    url: 'https://freestyler.ws/search?q=%s',
  },
];

const Popup = () => {
  const [enable, setEnable] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [domains, setDomains] = useState([]);
  const [empty, setEmpty] = useState('');
  const [styles, setStyles] = useState<SavedStyle[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = useMemo(() => {
    const result: NavItems = [
      { itemKey: 'styles', text: t('styles'), icon: <IconBrush /> },
      { itemKey: 'setting', text: t('openManage'), icon: <IconSetting /> },
    ];
    if (showSearch) {
      result.push({
        itemKey: 'add',
        text: t('addStyleLabel'),
        icon: <IconSearch />,
        children: searchOptions,
      });
    }
    if (domains.length > 0) {
      result.push({
        itemKey: 'add',
        text: t('addStyleLabel'),
        icon: <IconPlus />,
        children: domains.map((domain) => ({
          itemKey: `add-${domain}`,
          text: domain,
        })),
      });
    }
    return result;
  }, [domains]);

  useEffect(() => {
    prefs.ready(() => {
      setEnable(!prefs.get('disableAll'));
      // Get dark mode setting
      if (isDarkMode()) {
        document.body.setAttribute('theme-mode', 'dark');
      }
    });

    emitter.on(emitter.EVENT_PREFS_UPDATE, (key: string, value: any) => {
      if (key === 'disableAll') {
        setEnable(value);
      }
    });

    getActiveTab().then((tab) => {
      const tabUrl = tab.url;
      if (!canStyle(tabUrl)) {
        setEmpty(t('xStyleUnavailableForURL'));
        setLoading(false);
        return;
      }
      setShowSearch(true);
      const currentDomains = getDomains(tabUrl);
      if (currentDomains.length > 1) {
        currentDomains.splice(-1, 1);
      }
      setDomains(currentDomains);
      Api.getStyles({ url: tabUrl }).then((currentStyles) => {
        if (currentStyles.length === 0) {
          setEmpty(t('popupHaveNoStyle'));
        } else {
          setStyles(currentStyles as SavedStyle[]);
        }
        setLoading(false);
      });
    });
  }, []);

  const handleEnableChange = useCallback((checked: boolean) => {
    setEnable(checked);
    Api.setPrefs('disableAll', !checked);
  }, []);

  const handleNavSelect = useCallback((data: OnSelectedData) => {
    const newActive = data.itemKey as string;
    if (newActive === 'setting') {
      openOption();
    }
    if (newActive.indexOf('add-') === 0) {
      const domain = newActive.substring(4);
      openOption({
        action: 'add',
        domain,
      });
    }
    if (newActive.indexOf('search-') === 0) {
      const searchTarget = searchOptions.find((x) => x.itemKey === newActive).url;
      getActiveTab().then((tab) => {
        const tabUrl = tab.url;
        const domain = getDomains(tabUrl)[0];
        Api.openURL(searchTarget.replace('%s', encodeURIComponent(domain)));
      });
    }
  }, []);

  return (
    <SemiLocale>
      <div
        className={cx(basicStyle, {
          [mobileStyle]: IS_ANDROID,
        })}
      >
        <Nav
          className="navbar semi-always-dark"
          selectedKeys={['rules']}
          onSelect={handleNavSelect}
          header={{
            logo: <img src="/assets/images/128.png" style={{ width: '36px' }} />,
            text: 'xStyle',
          }}
          items={navItems}
          isCollapsed
          footer={
            <div>
              <Tooltip content={t('allStyles')} position="right">
                <Switch checked={enable} onChange={handleEnableChange} size="small" />
              </Tooltip>
            </div>
          }
        />
        <main className="main-content">
          <Table
            loading={loading}
            empty={empty}
            dataSource={styles}
            showHeader={false}
            rowKey="id"
            size="small"
            columns={[
              {
                title: 'enable',
                dataIndex: 'enable',
                className: 'cell-enable',
                align: 'center',
                width: 30,
                render: (value: boolean, item: SavedStyle) => (
                  <div className="switch-container">
                    <Switch
                      size="small"
                      checked={value}
                      onChange={(checked) => {
                        item.enabled = checked;
                        return Api.saveStyle(item);
                      }}
                    />
                  </div>
                ),
              },
              {
                title: 'name',
                dataIndex: 'name',
              },
              {
                title: 'action',
                dataIndex: 'name',
                className: 'cell-action',
                width: 96,
                render: (_, record) => (
                  <Tooltip content={t('editStyleLabel')}>
                    <Button
                      theme="borderless"
                      type="tertiary"
                      onClick={() => openOption({
                        action: 'edit',
                        id: record.id,
                      })}
                      icon={<IconEdit />}
                    />
                  </Tooltip>
                ),
              },
            ]}
            pagination={false}
          />
        </main>
      </div>
    </SemiLocale>
  );
};

export default Popup;
