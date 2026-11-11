import React from 'react';
import {
  CheckCircle,
  Clock,
  Info,
  MinusCircle,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';

/**
 * One Status Chip component with 5 semantic states:
 * - active (VERIFIED_ACTIVE / GOOD / ONLINE)
 * - pending (PENDING_CONFIRMATION / WARNING / WARN_AND_REQUIRE_CONFIRMATION)
 * - unverified (UNVERIFIED_HISTORICAL / INFO)
 * - expired (EXPIRED_SAFE_TO_REMOVE / MUTED / ALLOW_EDIT_EXPIRED)
 * - blocked (REJECT_EDIT / REJECTED_BY_FENCE / CRITICAL)
 *
 * When `hideIfDefault` is true, default "Verified Active" rows render quietly
 * without repeating a badge on every table row.
 */
export default function StatusBadge({ status, hideIfDefault = false }) {
  const { t } = useI18n();
  const norm = (status || 'VERIFIED_ACTIVE').toUpperCase();

  if (norm === 'VERIFIED_ACTIVE' || norm === 'GOOD' || norm === 'ONLINE' || norm === 'ACTIVE') {
    if (hideIfDefault) {
      return <span className="status-quiet">{t('statusVerifiedActive')}</span>;
    }
    return (
      <span className="status-badge status-good">
        <CheckCircle size={14} weight="regular" aria-hidden="true" />
        <span>{t('statusVerifiedActive')}</span>
      </span>
    );
  }

  if (
    norm === 'PENDING_CONFIRMATION' ||
    norm === 'WARNING' ||
    norm === 'STALE' ||
    norm === 'WARN_AND_REQUIRE_CONFIRMATION' ||
    norm === 'PENDING'
  ) {
    return (
      <span className="status-badge status-warning">
        <Warning size={14} weight="regular" aria-hidden="true" />
        <span>{t('statusPendingConfirmation')}</span>
      </span>
    );
  }

  if (norm === 'UNVERIFIED_HISTORICAL' || norm === 'INFO' || norm === 'UNVERIFIED') {
    return (
      <span className="status-badge status-info">
        <Info size={14} weight="regular" aria-hidden="true" />
        <span>{t('statusUnverifiedHistorical')}</span>
      </span>
    );
  }

  if (norm === 'EXPIRED_SAFE_TO_REMOVE' || norm === 'MUTED' || norm === 'ALLOW_EDIT_EXPIRED' || norm === 'EXPIRED') {
    return (
      <span className="status-badge status-muted">
        <MinusCircle size={14} weight="regular" aria-hidden="true" />
        <span>{t('statusExpiredSafe')}</span>
      </span>
    );
  }

  if (norm === 'REJECT_EDIT' || norm === 'REJECTED_BY_FENCE' || norm === 'CRITICAL' || norm === 'BLOCKED') {
    return (
      <span className="status-badge status-critical">
        <WarningOctagon size={14} weight="regular" aria-hidden="true" />
        <span>{t('statusBlocked')}</span>
      </span>
    );
  }

  return (
    <span className="status-badge status-muted">
      <Clock size={14} weight="regular" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
