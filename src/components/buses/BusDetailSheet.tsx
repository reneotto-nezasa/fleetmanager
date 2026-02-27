import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SeatMapMiniPreview } from '@/components/buses/SeatMapMiniPreview';
import { useCreateBus, useUpdateBus } from '@/hooks/useBuses';
import {
  useBusBoardingPoints,
  useAddBusBoardingPoint,
  useUpdateBusBoardingPoint,
  useRemoveBusBoardingPoint,
} from '@/hooks/useBusBoardingPoints';
import { useSeatMapTemplates } from '@/hooks/useSeatMapTemplates';
import { useBoardingPoints } from '@/hooks/useBoardingPoints';
import type { Tables, BusStatus } from '@/lib/database.types';

type BusWithTemplate = Tables['buses']['Row'] & {
  seat_map_templates: { id: string; name: string; rows: number; cols: number } | null;
};

interface BusDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: BusWithTemplate | null;
}

export function BusDetailSheet({ open, onOpenChange, bus }: BusDetailSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEditing = !!bus;

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<BusStatus>('active');
  const [seatMapId, setSeatMapId] = useState<string | undefined>(undefined);
  const [addBpId, setAddBpId] = useState<string | undefined>(undefined);

  // Mutations
  const createBus = useCreateBus();
  const updateBus = useUpdateBus();
  const addBusBp = useAddBusBoardingPoint();
  const updateBusBp = useUpdateBusBoardingPoint();
  const removeBusBp = useRemoveBusBoardingPoint();

  // Data queries
  const { data: templates, isLoading: templatesLoading } = useSeatMapTemplates();
  const { data: busBoardingPoints, isLoading: bpLoading } = useBusBoardingPoints(bus?.id);
  const { data: allBoardingPoints } = useBoardingPoints();

  // Available boarding points = all active minus those already assigned
  const availableBoardingPoints = useMemo(() => {
    if (!allBoardingPoints) return [];
    const assignedIds = new Set(busBoardingPoints?.map((bbp) => bbp.boarding_point_id) ?? []);
    return allBoardingPoints.filter(
      (bp) => bp.status === 'active' && !assignedIds.has(bp.id)
    );
  }, [allBoardingPoints, busBoardingPoints]);

  // Initialize form when bus changes
  useEffect(() => {
    if (bus) {
      setCode(bus.code);
      setName(bus.name);
      setDescription(bus.description ?? '');
      setStatus(bus.status);
      setSeatMapId(bus.seat_map_id ?? undefined);
    } else {
      setCode('');
      setName('');
      setDescription('');
      setStatus('active');
      setSeatMapId(undefined);
    }
    setAddBpId(undefined);
  }, [bus]);

  const isSaving = createBus.isPending || updateBus.isPending;

  const handleSave = useCallback(async () => {
    if (!code.trim() || !name.trim()) return;

    try {
      if (isEditing && bus) {
        await updateBus.mutateAsync({
          id: bus.id,
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          seat_map_id: seatMapId ?? undefined,
        });
        toast.success(t('toast.updated'));
      } else {
        await createBus.mutateAsync({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          seat_map_id: seatMapId ?? undefined,
        });
        toast.success(t('toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(t('toast.error'));
    }
  }, [code, name, description, status, seatMapId, isEditing, bus, updateBus, createBus, onOpenChange, t]);

  const handleAddBoardingPoint = useCallback(async () => {
    if (!addBpId || !bus) return;
    const nextOrder = (busBoardingPoints?.length ?? 0) + 1;
    try {
      await addBusBp.mutateAsync({
        bus_id: bus.id,
        boarding_point_id: addBpId,
        sort_order: nextOrder,
      });
      setAddBpId(undefined);
      toast.success(t('toast.saved'));
    } catch {
      toast.error(t('toast.error'));
    }
  }, [addBpId, bus, busBoardingPoints, addBusBp, t]);

  const handleUpdateAddonPrice = useCallback(
    async (bbpId: string, busId: string, price: number) => {
      try {
        await updateBusBp.mutateAsync({
          id: bbpId,
          busId,
          addon_price: price,
        });
      } catch {
        toast.error(t('toast.error'));
      }
    },
    [updateBusBp, t]
  );

  const handleRemoveBoardingPoint = useCallback(
    async (bbpId: string, busId: string) => {
      try {
        await removeBusBp.mutateAsync({ id: bbpId, busId });
        toast.success(t('toast.deleted'));
      } catch {
        toast.error(t('toast.error'));
      }
    },
    [removeBusBp, t]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('buses.editBus') : t('buses.addBus')}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? bus.code : t('buses.busInfo')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {/* Section 1: Bus Information */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('buses.busInfo')}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bus-code">{t('buses.code')}</Label>
                <Input
                  id="bus-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  readOnly={isEditing}
                  className={isEditing ? 'font-mono bg-muted cursor-not-allowed' : 'font-mono'}
                  placeholder="BUS-001"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-name">{t('buses.name')}</Label>
                <Input
                  id="bus-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('buses.name')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-description">{t('buses.description')}</Label>
                <Textarea
                  id="bus-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('buses.description')}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-status">{t('common.status')}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as BusStatus)}>
                  <SelectTrigger id="bus-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="retired">{t('common.retired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 2: Seat Map */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('buses.seatMap')}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="seat-map-template">{t('buses.seatMapTemplate')}</Label>
                {templatesLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={seatMapId ?? 'none'}
                    onValueChange={(v) => setSeatMapId(v === 'none' ? undefined : v)}
                  >
                    <SelectTrigger id="seat-map-template">
                      <SelectValue placeholder={t('buses.noTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('buses.noTemplate')}</SelectItem>
                      {templates?.map((tmpl) => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {seatMapId && (
                <div className="space-y-2">
                  <SeatMapMiniPreview templateId={seatMapId} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/seat-maps/${seatMapId}`)}
                  >
                    <Pencil />
                    {t('buses.editSeatMap')}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Section 3: Boarding Points */}
          {isEditing && bus && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('buses.boardingPoints')}
              </h3>

              {bpLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {busBoardingPoints && busBoardingPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {busBoardingPoints.map((bbp) => (
                        <li
                          key={bbp.id}
                          className="flex items-center gap-3 rounded-md border bg-card p-2.5"
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {bbp.boarding_points.name}
                            </p>
                            {bbp.boarding_points.city && (
                              <p className="text-xs text-muted-foreground">
                                {bbp.boarding_points.city}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground sr-only">
                                {t('buses.addonPrice')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-7 w-20 text-xs"
                                defaultValue={bbp.addon_price}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value) && value !== bbp.addon_price) {
                                    handleUpdateAddonPrice(bbp.id, bus.id, value);
                                  }
                                }}
                                placeholder={t('buses.addonPrice')}
                              />
                              <Badge variant="secondary" className="text-[10px]">EUR</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveBoardingPoint(bbp.id, bus.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">{t('buses.removeBoardingPoint')}</span>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      {t('common.noResults')}
                    </p>
                  )}

                  {/* Add Boarding Point */}
                  <div className="flex items-end gap-2 pt-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">{t('buses.addBoardingPoint')}</Label>
                      <Select
                        value={addBpId ?? 'none'}
                        onValueChange={(v) => setAddBpId(v === 'none' ? undefined : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('buses.addBoardingPoint')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>
                            {t('buses.addBoardingPoint')}
                          </SelectItem>
                          {availableBoardingPoints.map((bp) => (
                            <SelectItem key={bp.id} value={bp.id}>
                              {bp.name}
                              {bp.city ? ` (${bp.city})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddBoardingPoint}
                      disabled={!addBpId || addBusBp.isPending}
                    >
                      <Plus />
                      {t('common.add')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !code.trim() || !name.trim()}
          >
            {t('common.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
