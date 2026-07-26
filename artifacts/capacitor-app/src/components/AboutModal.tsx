import React from 'react';
import { Mail, Shield, FileText, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';
import { useColors } from '../hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = 'djaliltalbi642@gmail.com';
const PRIVACY_URL = 'https://abdeldgalil.github.io/Web-Browser-Shell/privacy.html';
const TERMS_URL = 'https://abdeldgalil.github.io/Web-Browser-Shell/terms.html';
const APP_VERSION = '1.0.0';

export default function AboutModal({ visible, onClose }: Props) {
  const colors = useColors();
  if (!visible) return null;

  const openLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await InAppBrowser.openWebView({ url, toolbarType: 'activity' } as any);
        return;
      } catch {
        // fall through to window.open
      }
    }
    window.open(url, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet about-sheet" style={{ background: colors.card }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="modal-header" style={{ borderBottomColor: colors.border }}>
          <span className="modal-title" style={{ color: colors.foreground }}>
            About
          </span>
          <button className="modal-close" style={{ background: colors.muted }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="about-content">
          <div className="about-logo" style={{ background: colors.primary }}>
            🧭
          </div>
          <div className="about-name" style={{ color: colors.foreground }}>
            Web Browser Shell
          </div>
          <div className="about-version" style={{ color: colors.mutedForeground }}>
            Version {APP_VERSION}
          </div>

          <div className="about-links">
            <button className="about-link-row" style={{ borderBottomColor: colors.border }} onClick={() => openLink(PRIVACY_URL)}>
              <Shield size={19} strokeWidth={2} color={colors.foreground} />
              <span style={{ color: colors.foreground, flex: 1 }}>Privacy Policy</span>
              <ExternalLink size={15} strokeWidth={2} color={colors.mutedForeground} />
            </button>
            <button className="about-link-row" style={{ borderBottomColor: colors.border }} onClick={() => openLink(TERMS_URL)}>
              <FileText size={19} strokeWidth={2} color={colors.foreground} />
              <span style={{ color: colors.foreground, flex: 1 }}>Terms of Service</span>
              <ExternalLink size={15} strokeWidth={2} color={colors.mutedForeground} />
            </button>
            <a className="about-link-row" style={{ borderBottomColor: colors.border }} href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail size={19} strokeWidth={2} color={colors.foreground} />
              <span style={{ color: colors.foreground, flex: 1 }}>Contact Support</span>
            </a>
          </div>

          <div className="about-footer" style={{ color: colors.mutedForeground }}>
            {SUPPORT_EMAIL}
          </div>
        </div>
      </div>
    </div>
  );
}
