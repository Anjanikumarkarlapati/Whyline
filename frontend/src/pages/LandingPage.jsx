import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GitBranch, Microphone, TreeStructure, ShieldCheck } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import WhyLineLogo from '../components/WhyLineLogo';

export default function LandingPage() {
  const { t } = useI18n();
  const { activeRepo } = useWorkbenchSelection?.() || {};

  return (
    <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '12px 0 36px' }}>
      <section className="glass-sheet reveal-stagger" style={{ '--stagger': 0, padding: 'clamp(24px, 4vw, 44px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '68ch' }}>
          <WhyLineLogo size="lg" showTagline />

          <h1 className="page-title" style={{ margin: 0, fontSize: 'var(--type-display)' }}>
            {t('landingHeadline')}
          </h1>

          <p style={{ margin: 0, fontSize: 'var(--type-md)', color: 'var(--text-secondary)', maxWidth: '60ch' }}>
            {t('landingSubtitle')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', paddingTop: '4px' }}>
            <Link to="/connect" className="btn btn-primary btn-lg">
              <GitBranch size={18} weight="regular" aria-hidden="true" />
              <span>{t('landingCtaConnect')}</span>
              <ArrowRight size={16} weight="regular" aria-hidden="true" />
            </Link>

            <Link to="/ask" className="btn btn-secondary btn-lg">
              <Microphone size={18} weight="regular" aria-hidden="true" />
              <span>{t('navAskRepo')}</span>
            </Link>

            <Link to="/flow" className="btn btn-tertiary btn-lg">
              <TreeStructure size={18} weight="regular" aria-hidden="true" />
              <span>{t('navFlowChat')}</span>
            </Link>
          </div>

          {activeRepo?.fullName && (
            <div className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 14px', width: 'fit-content', borderRadius: '14px' }}>
              <ShieldCheck size={16} weight="fill" style={{ color: 'var(--status-good)' }} aria-hidden="true" />
              <span className="small-caps">{t('activeRepoLabel')}:</span>
              <code className="mono-metric">{activeRepo.fullName}</code>
            </div>
          )}
        </div>
      </section>

      <section
        aria-label="Core workflows"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <Link to="/connect" className="glass reveal-stagger landing-pillar-link" style={{ '--stagger': 1, padding: '20px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--accent)' }}>
            <GitBranch size={20} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0, fontSize: 'var(--type-md)' }}>{t('navConnect')}</h2>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
            {t('landingPillarConnect')}
          </p>
        </Link>

        <Link to="/ask" className="glass reveal-stagger landing-pillar-link" style={{ '--stagger': 2, padding: '20px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--accent)' }}>
            <Microphone size={20} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0, fontSize: 'var(--type-md)' }}>{t('navAskRepo')}</h2>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
            {t('landingPillarAsk')}
          </p>
        </Link>

        <Link to="/flow" className="glass reveal-stagger landing-pillar-link" style={{ '--stagger': 3, padding: '20px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--accent)' }}>
            <TreeStructure size={20} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0, fontSize: 'var(--type-md)' }}>{t('navFlowChat')}</h2>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
            {t('landingPillarFlow')}
          </p>
        </Link>
      </section>
    </div>
  );
}
