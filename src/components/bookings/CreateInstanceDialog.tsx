import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBuses } from '@/hooks/useBuses';
import { useCreateSeatMapInstance } from '@/hooks/useSeatMapInstances';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBusId?: string;
}

export function CreateInstanceDialog({
  open,
  onOpenChange,
  defaultBusId,
}: CreateInstanceDialogProps) {
  const { t } = useTranslation();
  const { data: buses } = useBuses();
  const createInstance = useCreateSeatMapInstance();

  const [busId, setBusId] = useState(defaultBusId ?? '');
  const [departureDate, setDepartureDate] = useState('');

  // Reset form when dialog opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setBusId(defaultBusId ?? '');
      setDepartureDate('');
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!busId || !departureDate) return;

    createInstance.mutate(
      { busId, departureDate },
      {
        onSuccess: () => {
          toast.success(t('toast.created'));
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t('toast.error'));
        },
      },
    );
  }

  const activeBuses = buses?.filter((b) => b.status === 'active' && b.seat_map_id) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bookings.createInstance')}</DialogTitle>
          <DialogDescription>
            {t('bookings.createInstanceDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ci-bus">{t('bookings.bus')}</Label>
            <Select value={busId} onValueChange={setBusId}>
              <SelectTrigger id="ci-bus">
                <SelectValue placeholder={t('bookings.selectBus')} />
              </SelectTrigger>
              <SelectContent>
                {activeBuses.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id}>
                    {bus.code} - {bus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ci-date">{t('bookings.departureDate')}</Label>
            <Input
              id="ci-date"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!busId || !departureDate || createInstance.isPending}
            >
              {createInstance.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
