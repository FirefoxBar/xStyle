/* eslint-disable max-lines */
import { IconFolderOpen, IconPlusCircle, IconRefresh } from '@douyinfe/semi-icons';
import { Button, Select, Space, Spin, Tooltip, Typography } from '@douyinfe/semi-ui';
import { css, cx } from '@emotion/css';
import { useRequest } from 'ahooks';
import React, { useMemo, useState } from 'react';
import Api from '@/share/pages/api';
import { t } from '@/share/core/utils';
import { SavedStyle } from '@/share/core/types';
import StyleCard from './style-card';

interface StylesProps {
  visible: boolean;
}

const Styles = (props: StylesProps) => {
  const { visible } = props;

  const { data: gotStyles, loading } = useRequest(() => Api.getStyles({}), {
    manual: false,
  });

  const [sort, setSort] = useState('id');

  const styles = useMemo(() => {
    if (!gotStyles) {
      return [];
    }
    return (gotStyles as SavedStyle[]).sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'id':
          return a.id - b.id;
        case 'modified':
          return b.lastModified - a.lastModified;
        case 'status':
          if (a.enabled === b.enabled) {
            return 0;
          }
          return b.enabled ? 1 : -1;
        default:
          return 0;
      }
    });
  }, [gotStyles, sort]);

  return (
    <section
      className={cx('section-styles', {
        visible,
        'in-visible': !visible,
      })}
    >
      <div
        className={css`
          display: flex;
          flex-direction: row;
          padding-bottom: 16px;
        `}
      >
        <Typography.Title heading={2}>{t('styles')}</Typography.Title>
        <div style={{ flexGrow: 1 }} />
        <Space>
          <Select
            placeholder={t('sortStyles')}
            optionList={[
              { label: t('sortStylesById'), value: 'id' },
              { label: t('sortStylesByStatus'), value: 'status' },
              { label: t('sortStylesByName'), value: 'name' },
              { label: t('sortStylesByModified'), value: 'modified' },
            ]}
            value={sort}
            onChange={setSort}
          />
          <Tooltip content={t('updateAllStyles')}>
            <Button theme="borderless" type="tertiary" icon={<IconRefresh />} />
          </Tooltip>
          <Tooltip content={t('installFromFile')}>
            <Button theme="borderless" type="tertiary" icon={<IconFolderOpen />} />
          </Tooltip>
          <Button type="primary" theme="solid" icon={<IconPlusCircle />}>
            {t('addStyleLabel')}
          </Button>
        </Space>
      </div>
      <Spin size="large" spinning={loading}>
        <div
          className={css`
            height: calc(100vh - 88px);
            overflow: auto;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            flex-wrap: wrap;
            gap: 12px;

            > div {
              width: 50%;
              margin-bottom: 12px;
            }
          `}
        >
          {styles.map((item) => <StyleCard key={item.id} style={item} />)}
        </div>
      </Spin>
    </section>
  );
};

export default Styles;
