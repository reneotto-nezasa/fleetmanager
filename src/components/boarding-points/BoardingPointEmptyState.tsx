import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BoardingPointEmptyStateProps {
  onAdd: () => void;
}

export function BoardingPointEmptyState({ onAdd }: BoardingPointEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">
        {t('boardingPoints.emptyState')}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t('boardingPoints.emptyStateDescription')}
      </p>
      <Button onClick={onAdd} className="mt-6">
        {t('boardingPoints.addBoardingPoint')}
      </Button>
    </div>
  );
}
