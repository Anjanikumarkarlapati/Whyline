import React from 'react';
import MonacoCodeStudio from '../components/MonacoCodeStudio';
import { useI18n } from '../i18n';

export default function WorkbenchPage({ theme }) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">{t('workbenchContext')}</p>
          <h1 className="page-title">{t('workbenchTitle')}</h1>
        </div>
      </section>
      <MonacoCodeStudio theme={theme} />
    </div>
  );
}
