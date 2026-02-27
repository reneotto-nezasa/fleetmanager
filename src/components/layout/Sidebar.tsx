import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Bus, MapPin, BookOpen, Sun, Moon, Monitor, PanelLeftClose, PanelLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/buses', icon: Bus, labelKey: 'nav.buses' },
  { path: '/boarding-points', icon: MapPin, labelKey: 'nav.boardingPoints' },
  { path: '/bookings', icon: BookOpen, labelKey: 'nav.bookings' },
] as const;

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  // Auto-collapse sidebar when viewport < 1280px; track < 1024px for warning
  useEffect(() => {
    const mqlCollapse = window.matchMedia('(max-width: 1279px)');
    const mqlWarning = window.matchMedia('(max-width: 1023px)');

    const handleCollapse = (e: MediaQueryListEvent | MediaQueryList) => {
      setCollapsed(e.matches);
    };
    const handleWarning = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsNarrow(e.matches);
    };

    // Set initial state
    handleCollapse(mqlCollapse);
    handleWarning(mqlWarning);

    mqlCollapse.addEventListener('change', handleCollapse);
    mqlWarning.addEventListener('change', handleWarning);
    return () => {
      mqlCollapse.removeEventListener('change', handleCollapse);
      mqlWarning.removeEventListener('change', handleWarning);
    };
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
  };

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]!);
  };

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b px-4', collapsed && 'justify-center px-2')}>
          {collapsed ? (
            <Bus className="h-6 w-6 text-primary" />
          ) : (
            <div className="flex items-center gap-2">
              <Bus className="h-6 w-6 text-primary" />
              <span className="font-semibold text-sm">Bus Fleet Manager</span>
            </div>
          )}
        </div>

        {/* Desktop warning banner for narrow viewports */}
        {isNarrow && !collapsed && (
          <div className="mx-2 mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('layout.desktopWarning')}</span>
          </div>
        )}
        {isNarrow && collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-2 mt-2 flex justify-center rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{t('layout.desktopWarning')}</TooltipContent>
          </Tooltip>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            const link = (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-2 space-y-1">
          <Separator className="mb-2" />

          {/* Language toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={toggleLanguage}
                className={cn('w-full', !collapsed && 'justify-start gap-2')}
              >
                <span className="font-mono text-xs font-bold">{i18n.language.toUpperCase()}</span>
                {!collapsed && <span>{i18n.language === 'de' ? 'Deutsch' : 'English'}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{i18n.language === 'de' ? 'Deutsch' : 'English'}</TooltipContent>}
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={cycleTheme}
                className={cn('w-full', !collapsed && 'justify-start gap-2')}
              >
                <ThemeIcon className="h-4 w-4" />
                {!collapsed && <span>{t(`theme.${theme}`)}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t(`theme.${theme}`)}</TooltipContent>}
          </Tooltip>

          {/* Collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={() => setCollapsed(!collapsed)}
                className={cn('w-full', !collapsed && 'justify-start gap-2')}
              >
                {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                {!collapsed && <span>{collapsed ? 'Expand' : 'Collapse'}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
