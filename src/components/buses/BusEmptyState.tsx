import { useTranslation } from 'react-i18next';
import { Bus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BusEmptyStateProps {
  onAdd: () => void;
}

export function BusEmptyState({ onAdd }: BusEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Bus className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">{t('buses.emptyState')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('buses.emptyStateDescription')}
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus />
        {t('buses.addBus')}
      </Button>
    </div>
  );
}
