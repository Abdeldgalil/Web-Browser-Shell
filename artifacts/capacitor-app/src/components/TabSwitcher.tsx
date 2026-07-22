import React from 'react';
import { Plus, X, VenetianMask } from 'lucide-react';
import { useColors } from '../hooks/useColors';
import { useBrowser, getDisplayUrl, HOME_URL } from '../context/BrowserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TabSwitcher({ visible, onClose }: Props) {
  const colors = useColors();
  const { tabs, activeTabId, switchTab, closeTab, newTab } = useBrowser();

  if (!visible) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet tabswitcher-sheet"
        style={{ background: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="modal-header" style={{ borderBottomColor: colors.border }}>
          <span className="modal-title" style={{ color: colors.foreground }}>
            {tabs.length} {tabs.length === 1 ? 'Tab' : 'Tabs'}
          </span>
          <button className="modal-close" style={{ background: colors.muted }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabswitcher-grid">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const label = tab.url === HOME_URL ? 'New Tab' : tab.title || getDisplayUrl(tab.url);
            return (
              <button
                key={tab.id}
                className={`tabswitcher-card${tab.incognito ? ' tabswitcher-card-incognito' : ''}`}
                style={{
                  background: tab.incognito ? undefined : colors.muted,
                  borderColor: isActive ? colors.primary : 'transparent',
                }}
                onClick={() => {
                  switchTab(tab.id);
                  onClose();
                }}
              >
                <button
                  className="tabswitcher-close"
                  style={{
                    background: tab.incognito ? 'rgba(255,255,255,0.15)' : colors.card,
                    color: tab.incognito ? '#fff' : colors.mutedForeground,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
                <div className="tabswitcher-card-icon">
                  {tab.incognito ? (
                    <span className="incognito-badge incognito-badge-lg">
                      <VenetianMask size={26} strokeWidth={2} color="#fff" />
                    </span>
                  ) : tab.url === HOME_URL ? (
                    '🧭'
                  ) : (
                    '🌐'
                  )}
                </div>
                <div
                  className="tabswitcher-card-label"
                  style={{ color: tab.incognito ? '#fff' : colors.foreground }}
                >
                  {tab.incognito ? 'Private' : label}
                </div>
              </button>
            );
          })}

          <button
            className="tabswitcher-new"
            style={{ borderColor: colors.border, color: colors.mutedForeground }}
            onClick={() => {
              newTab();
              onClose();
            }}
          >
            <Plus size={26} strokeWidth={2} />
            <span>New Tab</span>
          </button>

          <button
            className="tabswitcher-new tabswitcher-new-incognito"
            onClick={() => {
              newTab(HOME_URL, true);
              onClose();
            }}
          >
            <span className="incognito-badge incognito-badge-md">
              <VenetianMask size={22} strokeWidth={2} color="#fff" />
            </span>
            <span>Private Tab</span>
          </button>
        </div>
      </div>
    </div>
  );
}
