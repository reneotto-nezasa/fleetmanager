import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bus, MapPin, BookOpen, LayoutDashboard } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useBuses } from '@/hooks/useBuses';
import { useBoardingPoints } from '@/hooks/useBoardingPoints';
import { useBookings } from '@/hooks/useBookings';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: buses } = useBuses();
  const { data: boardingPoints } = useBoardingPoints();
  const { data: bookings } = useBookings();

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('commandPalette.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('commandPalette.noResults')}</CommandEmpty>

        <CommandGroup heading={t('commandPalette.navigation')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t('nav.dashboard')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/buses'))}>
            <Bus className="mr-2 h-4 w-4" />
            {t('nav.buses')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/boarding-points'))}>
            <MapPin className="mr-2 h-4 w-4" />
            {t('nav.boardingPoints')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/bookings'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            {t('nav.bookings')}
          </CommandItem>
        </CommandGroup>

        {buses && buses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('commandPalette.buses')}>
              {buses.map((bus) => (
                <CommandItem
                  key={bus.id}
                  onSelect={() => runCommand(() => navigate('/buses'))}
                  value={`${bus.code} ${bus.name}`}
                >
                  <Bus className="mr-2 h-4 w-4" />
                  <span className="font-mono text-xs mr-2">{bus.code}</span>
                  {bus.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {boardingPoints && boardingPoints.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('commandPalette.boardingPoints')}>
              {boardingPoints.map((bp) => (
                <CommandItem
                  key={bp.id}
                  onSelect={() => runCommand(() => navigate('/boarding-points'))}
                  value={`${bp.code} ${bp.name} ${bp.city}`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="font-mono text-xs mr-2">{bp.code}</span>
                  {bp.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {bookings && bookings.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('commandPalette.bookings')}>
              {bookings.slice(0, 5).map((booking) => (
                <CommandItem
                  key={booking.id}
                  onSelect={() => runCommand(() => navigate('/bookings'))}
                  value={booking.booking_ref}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span className="font-mono text-xs">{booking.booking_ref}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
