import React from 'react';
import { Share2, Search, Monitor, Check } from 'lucide-react';
import { useColors } from '../hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  onFindInPage: () => void;
  onToggleDesktop: () => void;
  desktopMode: boolean;
  disabled: boolean;
}

export default function MoreMenu({
  visible,
  onClose,
  onShare,
  onFindInPage,
  onToggleDesktop,
  desktopMode,
  disabled,
}: Props) {
  const colors = useColors();
  if (!visible) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet more-menu-sheet"
        style={{ background: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="more-menu-list">
          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onShare)}
          >
            <Share2 size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>Share Page</span>
          </button>

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onFindInPage)}
          >
            <Search size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>Find in Page</span>
          </button>

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onToggleDesktop)}
          >
            <Monitor size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground, flex: 1 }}>Request Desktop Site</span>
            {desktopMode && <Check size={18} strokeWidth={2.5} color={colors.primary} />}
          </button>
        </div>
      </div>
    </div>
  );
}
