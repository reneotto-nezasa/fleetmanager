import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { BoardingPoint, BoardingPointStatus } from '@/lib/database.types';
import {
  useCreateBoardingPoint,
  useUpdateBoardingPoint,
} from '@/hooks/useBoardingPoints';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface BoardingPointSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPoint?: BoardingPoint | null;
}

interface FormState {
  code: string;
  name: string;
  city: string;
  postal_code: string;
  address: string;
  latitude: string;
  longitude: string;
  status: BoardingPointStatus;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  city: '',
  postal_code: '',
  address: '',
  latitude: '',
  longitude: '',
  status: 'active',
};

function toFormState(point: BoardingPoint): FormState {
  return {
    code: point.code ?? '',
    name: point.name,
    city: point.city ?? '',
    postal_code: point.postal_code ?? '',
    address: point.address ?? '',
    latitude: point.latitude != null ? String(point.latitude) : '',
    longitude: point.longitude != null ? String(point.longitude) : '',
    status: point.status,
  };
}

export function BoardingPointSheet({
  open,
  onOpenChange,
  editingPoint,
}: BoardingPointSheetProps) {
  const { t } = useTranslation();
  const createMutation = useCreateBoardingPoint();
  const updateMutation = useUpdateBoardingPoint();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isEditing = editingPoint != null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Reset form when the sheet opens or the editing point changes
  useEffect(() => {
    if (open) {
      setForm(editingPoint ? toFormState(editingPoint) : EMPTY_FORM);
    }
  }, [open, editingPoint]);

  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const lat = form.latitude.trim() !== '' ? parseFloat(form.latitude) : null;
    const lng = form.longitude.trim() !== '' ? parseFloat(form.longitude) : null;

    const payload = {
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      postal_code: form.postal_code.trim() || undefined,
      address: form.address.trim() || undefined,
      latitude: lat != null && !Number.isNaN(lat) ? lat : undefined,
      longitude: lng != null && !Number.isNaN(lng) ? lng : undefined,
      status: form.status,
    };

    try {
      if (isEditing && editingPoint) {
        await updateMutation.mutateAsync({ id: editingPoint.id, ...payload });
        toast.success(t('toast.updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(t('toast.error'));
    }
  }, [
    form,
    isEditing,
    editingPoint,
    createMutation,
    updateMutation,
    onOpenChange,
    t,
  ]);

  const hasCoordinates =
    form.latitude.trim() !== '' && form.longitude.trim() !== '';
  const canSave = form.name.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing
              ? t('boardingPoints.editBoardingPoint')
              : t('boardingPoints.addBoardingPoint')}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? t('boardingPoints.editBoardingPoint')
              : t('boardingPoints.addBoardingPoint')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 py-4">
          {/* Code */}
          <div className="grid gap-2">
            <Label htmlFor="bp-code">{t('boardingPoints.code')}</Label>
            <Input
              id="bp-code"
              className="font-mono"
              value={form.code}
              onChange={(e) => handleFieldChange('code', e.target.value)}
              placeholder="BP-001"
            />
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="bp-name">{t('boardingPoints.name')}</Label>
            <Input
              id="bp-name"
              value={form.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              required
            />
          </div>

          {/* City */}
          <div className="grid gap-2">
            <Label htmlFor="bp-city">{t('boardingPoints.city')}</Label>
            <Input
              id="bp-city"
              value={form.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
            />
          </div>

          {/* Postal code */}
          <div className="grid gap-2">
            <Label htmlFor="bp-postal-code">
              {t('boardingPoints.postalCode')}
            </Label>
            <Input
              id="bp-postal-code"
              className="font-mono"
              value={form.postal_code}
              onChange={(e) => handleFieldChange('postal_code', e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="bp-address">{t('boardingPoints.address')}</Label>
            <Input
              id="bp-address"
              value={form.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bp-lat">{t('boardingPoints.latitude')}</Label>
              <Input
                id="bp-lat"
                type="number"
                step="any"
                className="font-mono"
                value={form.latitude}
                onChange={(e) => handleFieldChange('latitude', e.target.value)}
                placeholder="51.2277"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bp-lng">{t('boardingPoints.longitude')}</Label>
              <Input
                id="bp-lng"
                type="number"
                step="any"
                className="font-mono"
                value={form.longitude}
                onChange={(e) => handleFieldChange('longitude', e.target.value)}
                placeholder="6.7735"
              />
            </div>
          </div>

          {/* Coordinates preview */}
          {hasCoordinates && (
            <div className="rounded-md border bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t('boardingPoints.coordinates')}
              </p>
              <p className="mt-0.5 font-mono text-sm">
                {form.latitude}, {form.longitude}
              </p>
            </div>
          )}

          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="bp-status">{t('common.status')}</Label>
            <Select
              value={form.status}
              onValueChange={(value: BoardingPointStatus) =>
                handleFieldChange('status', value)
              }
            >
              <SelectTrigger id="bp-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
