import { useEffect, useState, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { Layouts, Page } from '@strapi/strapi/admin';
import { Badge, Box, Flex, Grid, Typography } from '@strapi/design-system';

import { getState, subscribe, type RtlState } from '../rtl/engine';
import { getTranslation } from '../utils/getTranslation';

const CONFIG_EXAMPLE = `// config/plugins.js
module.exports = {
  rtl: {
    config: {
      // interface: true,      // mirror the admin when its language is RTL
      // content: true,        // RTL fields for RTL content locales
      // mirrorStyles: true,   // swap Strapi's left/right styles
      // rtlLocales: ['ar', 'he', 'fa', 'ur'],
      // ltrFields: ['sku'],   // extra field names that stay LTR
      // backLabels: [],       // extra "Back" link texts whose arrow is mirrored
      // fontFamily: "'Noto Sans Arabic', sans-serif",
    },
  },
};`;

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Flex justifyContent="space-between" gap={4} paddingTop={2} paddingBottom={2}>
    <Typography variant="omega" textColor="neutral600">
      {label}
    </Typography>
    <Box>{children}</Box>
  </Flex>
);

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box background="neutral0" hasRadius shadow="tableShadow" padding={6} width="100%">
    <Typography variant="delta" tag="h2">
      {title}
    </Typography>
    <Box paddingTop={3}>{children}</Box>
  </Box>
);

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) => formatMessage({ id: getTranslation(id), defaultMessage });
  const [state, setState] = useState<RtlState>(getState);

  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  const { settings } = state;
  const onOff = (value: boolean) => <Badge active={value}>{value ? t('value.on', 'On') : t('value.off', 'Off')}</Badge>;
  const direction = (rtl: boolean) => <Badge active={rtl}>{rtl ? 'RTL' : 'LTR'}</Badge>;

  return (
    <Page.Main>
      <Page.Title>{t('settings.title', 'RTL support')}</Page.Title>
      <Layouts.Header
        title={t('settings.title', 'RTL support')}
        subtitle={t('settings.subtitle', 'Right-to-left admin panel and content editing. Configured in config/plugins.')}
      />
      <Layouts.Content>
        <Grid.Root gap={6}>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Card title={t('status.title', 'Current status')}>
              <Row label={t('status.interface', 'Interface language')}>
                <Flex gap={2}>
                  <Typography fontWeight="bold">{state.interfaceLanguage || '—'}</Typography>
                  {direction(state.interfaceRtl)}
                </Flex>
              </Row>
              <Row label={t('status.content', 'Content locale')}>
                <Flex gap={2}>
                  <Typography fontWeight="bold">{state.contentLocale || t('status.none', 'not editing content')}</Typography>
                  {state.contentLocale ? direction(state.contentRtl) : null}
                </Flex>
              </Row>
              <Box paddingTop={3}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'status.hint',
                    'Change the interface language in your profile; the content locale follows the locale picker of the edit view.',
                  )}
                </Typography>
              </Box>
            </Card>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Card title={t('config.title', 'Configuration')}>
              <Row label={t('config.interface', 'Mirror RTL interface')}>{onOff(settings.interface)}</Row>
              <Row label={t('config.content', 'RTL content fields')}>{onOff(settings.content)}</Row>
              <Row label={t('config.mirrorStyles', 'Mirror left/right styles')}>{onOff(settings.mirrorStyles)}</Row>
              <Row label={t('config.rtlLocales', 'RTL languages')}>
                <Typography dir="auto">{settings.rtlLocales.join(', ')}</Typography>
              </Row>
              <Row label={t('config.ltrFields', 'Extra LTR fields')}>
                <Typography dir="auto">{settings.ltrFields.length ? settings.ltrFields.join(', ') : '—'}</Typography>
              </Row>
              <Row label={t('config.fontFamily', 'RTL font')}>
                <Typography dir="auto">{settings.fontFamily || t('config.default', 'Strapi default')}</Typography>
              </Row>
            </Card>
          </Grid.Item>
          <Grid.Item col={12} direction="column" alignItems="stretch">
            <Card title={t('howto.title', 'How to configure')}>
              <Box background="neutral100" hasRadius padding={4} dir="ltr" data-rtl-ignore="">
                <Typography tag="pre" variant="pi" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {CONFIG_EXAMPLE}
                </Typography>
              </Box>
            </Card>
          </Grid.Item>
        </Grid.Root>
      </Layouts.Content>
    </Page.Main>
  );
};

export default SettingsPage;
