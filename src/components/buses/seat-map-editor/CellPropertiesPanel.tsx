import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CellType } from '@/lib/database.types';
import type { EditorCell } from './useSeatMapEditor';

interface CellPropertiesPanelProps {
  selectedCells: EditorCell[];
  onUpdate: (updates: Partial<EditorCell>) => void;
}

const ALL_CELL_TYPES: CellType[] = [
  'seat',
  'driver',
  'tour_guide',
  'wc',
  'kitchen',
  'entry',
  'table',
  'empty',
  'stairway',
];

export function CellPropertiesPanel({ selectedCells, onUpdate }: CellPropertiesPanelProps) {
  const { t } = useTranslation();

  if (selectedCells.length === 0) {
    return (
      <div className="w-[280px] shrink-0 border-l bg-background p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {t('seatMapEditor.properties')}
        </h3>
        <Separator className="mb-4" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t('seatMapEditor.noSelection')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('seatMapEditor.selectCell')}
          </p>
        </div>
      </div>
    );
  }

  // Determine shared values across all selected cells
  const firstCell = selectedCells[0]!;
  const allSameType = selectedCells.every((c) => c.cell_type === firstCell.cell_type);
  const currentType = allSameType ? firstCell.cell_type : undefined;
  const showLabel = selectedCells.length === 1;
  const hasSeatSelected = selectedCells.some((c) => c.cell_type === 'seat');

  // Shared attribute values (true only if all selected have it)
  const sharedPremium = selectedCells.every((c) => c.attributes.premium === true);
  const sharedExtraLegroom = selectedCells.every((c) => c.attributes.extraLegroom === true);
  const sharedWheelchair = selectedCells.every((c) => c.attributes.wheelchair === true);

  const handleTypeChange = (value: string) => {
    onUpdate({ cell_type: value as CellType });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ label: e.target.value || null });
  };

  const handleAttributeToggle = (attr: string, checked: boolean) => {
    onUpdate({
      attributes: { [attr]: checked || undefined },
    });
  };

  return (
    <div className="w-[280px] shrink-0 border-l bg-background p-4 flex flex-col gap-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {t('seatMapEditor.properties')}
        </h3>
        <Separator />
      </div>

      {selectedCells.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {t('seatMapEditor.selectedCells', { count: selectedCells.length })}
        </p>
      )}

      {/* Cell Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('seatMapEditor.cellType')}</Label>
        <Select
          value={currentType ?? ''}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue
              placeholder={
                currentType
                  ? t(`seatMapEditor.cellTypes.${currentType}`)
                  : '...'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {ALL_CELL_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="text-xs">
                {t(`seatMapEditor.cellTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Label (single selection only) */}
      {showLabel && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('seatMapEditor.label')}</Label>
          <Input
            value={firstCell.label ?? ''}
            onChange={handleLabelChange}
            placeholder="z.B. 1A"
            className="h-8 text-xs font-mono"
          />
        </div>
      )}

      {/* Attributes (shown when at least one seat is selected) */}
      {hasSeatSelected && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs">{t('seatMapEditor.attributes')}</Label>

            <div className="flex items-center gap-2">
              <Checkbox
                id="attr-premium"
                checked={sharedPremium}
                onCheckedChange={(checked) =>
                  handleAttributeToggle('premium', checked === true)
                }
              />
              <label
                htmlFor="attr-premium"
                className="text-xs cursor-pointer select-none"
              >
                {t('seatMapEditor.premium')}
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="attr-extraLegroom"
                checked={sharedExtraLegroom}
                onCheckedChange={(checked) =>
                  handleAttributeToggle('extraLegroom', checked === true)
                }
              />
              <label
                htmlFor="attr-extraLegroom"
                className="text-xs cursor-pointer select-none"
              >
                {t('seatMapEditor.extraLegroom')}
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="attr-wheelchair"
                checked={sharedWheelchair}
                onCheckedChange={(checked) =>
                  handleAttributeToggle('wheelchair', checked === true)
                }
              />
              <label
                htmlFor="attr-wheelchair"
                className="text-xs cursor-pointer select-none"
              >
                {t('seatMapEditor.wheelchair')}
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
