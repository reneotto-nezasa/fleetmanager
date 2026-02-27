import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

function useBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const crumbs: Array<{ label: string; path: string }> = [];

  if (segments.length === 0) {
    crumbs.push({ label: t('nav.dashboard'), path: '/' });
  } else {
    const keyMap: Record<string, string> = {
      buses: 'nav.buses',
      'boarding-points': 'nav.boardingPoints',
      bookings: 'nav.bookings',
    };

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const path = '/' + segments.slice(0, i + 1).join('/');
      const key = keyMap[segment];
      const label = key ? t(key) : segment;
      crumbs.push({ label, path });
    }
  }

  return crumbs;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const { t } = useTranslation();
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={i === crumbs.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          className="pl-8 h-8 text-sm"
          onFocus={onOpenCommandPalette}
          readOnly
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>
    </header>
  );
}
