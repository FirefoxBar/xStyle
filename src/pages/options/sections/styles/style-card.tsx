import { IconCommand, IconDelete, IconEdit, IconExport, IconRefresh } from '@douyinfe/semi-icons';
import { Button, Card, Space, Switch, Typography } from '@douyinfe/semi-ui';
import React, { useMemo, useCallback } from 'react';
import Api from '@/share/pages/api';
import { t } from '@/share/core/utils';
import { SavedStyle } from '@/share/core/types';

interface StyleCardProps {
  style: SavedStyle;
}

const StyleCard = (props: StyleCardProps) => {
  const { style } = props;

  const handleToggleEnable = useCallback((target: boolean) => {
    Api.saveStyle({
      id: style.id,
      enabled: target,
    });
  }, []);

  const content = useMemo(() => {
    const result: string[] = [];
    style.sections.forEach((section) => {
      if (section.domains) {
        section.domains.forEach((domain) => result.push(domain));
      }
      if (section.urls) {
        section.urls.forEach((url) => result.push(url));
      }
      if (section.urlPrefixes) {
        section.urlPrefixes.forEach((prefix) => result.push(`${prefix}*`));
      }
      if (section.regexps) {
        section.regexps.forEach((regexp) => result.push(`/${regexp}/`));
      }
    });
    return result;
  }, [style.sections]);

  return (
    <Card
      title={style.name}
      headerExtraContent={<Switch checked={style.enabled} onChange={handleToggleEnable} />}
      footer={
        <Space>
          <Button theme="borderless" type="tertiary" icon={<IconDelete />}>
            {t('deleteStyleLabel')}
          </Button>
          <Button theme="borderless" type="tertiary" icon={<IconRefresh />}>
            {t('updateOneStyle')}
          </Button>
          <Button theme="borderless" type="tertiary" icon={<IconExport />}>
            {t('export')}
          </Button>
          <Button theme="borderless" type="tertiary" icon={<IconCommand />}>
            {t('advancedTitle')}
          </Button>
          <Button theme="borderless" type="primary" icon={<IconEdit />}>
            {t('editStyleLabel')}
          </Button>
        </Space>
      }
    >
      <Space>
        {content.map((item) => (
          <Typography.Text key={item} code>
            {item}
          </Typography.Text>
        ))}
      </Space>
    </Card>
  );
};

export default StyleCard;
