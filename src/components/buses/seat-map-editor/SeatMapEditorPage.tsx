import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBus } from '@/hooks/useBuses';
import {
  useSeatTemplateCells,
  useUpdateSeatMapTemplate,
  useSaveSeatTemplateCells,
} from '@/hooks/useSeatMapTemplates';
import { SeatMapCanvas } from './SeatMapCanvas';
import { CellPropertiesPanel } from './CellPropertiesPanel';
import { useSeatMapEditor } from './useSeatMapEditor';
import type { MoveDirection } from './useSeatMapEditor';
import { HUMMEL_28_1, NOVERMANN_44_1 } from './seatMapPresets';
import type { EditorCell } from './useSeatMapEditor';
import type { SeatMapPreset } from './seatMapPresets';

export function SeatMapEditorPage() {
  const { id: busId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: bus, isLoading: busLoading } = useBus(busId);
  const templateId = bus?.seat_map_templates?.id;
  const { data: templateCells, isLoading: cellsLoading } = useSeatTemplateCells(templateId);

  const updateTemplate = useUpdateSeatMapTemplate();
  const saveCells = useSaveSeatTemplateCells();

  const editor = useSeatMapEditor(
    bus?.seat_map_templates?.name ?? '',
    bus?.seat_map_templates?.rows ?? 10,
    bus?.seat_map_templates?.cols ?? 4
  );

  const [initialized, setInitialized] = useState(false);

  // Load data from database when available
  useEffect(() => {
    if (initialized) return;
    if (!bus?.seat_map_templates || !templateCells) return;

    const dbCells: EditorCell[] = templateCells.map((c) => ({
      row_idx: c.row_idx,
      col_idx: c.col_idx,
      label: c.label,
      cell_type: c.cell_type,
      attributes: c.attributes ?? {},
    }));

    editor.actions.loadFromDatabase(
      dbCells,
      bus.seat_map_templates.rows,
      bus.seat_map_templates.cols
    );
    editor.actions.setTemplateName(bus.seat_map_templates.name);
    setInitialized(true);
  }, [bus, templateCells, initialized, editor.actions]);

  // Arrow key navigation for seat map
  useEffect(() => {
    const arrowMap: Record<string, MoveDirection> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };

    function handleKeyDown(e: KeyboardEvent) {
      const direction = arrowMap[e.key];
      if (!direction) return;

      // Don't intercept if the user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      editor.actions.moveSelection(direction);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor.actions]);

  // Resolve selected cells from the 2D grid
  const selectedCellObjects = useMemo(() => {
    const result: EditorCell[] = [];
    editor.selectedCells.forEach((key) => {
      const parts = key.split('-').map(Number);
      const r = parts[0];
      const c = parts[1];
      if (r === undefined || c === undefined) return;
      const row = editor.cells[r];
      const cell = row?.[c];
      if (cell) {
        result.push(cell);
      }
    });
    return result;
  }, [editor.selectedCells, editor.cells]);

  const handleSave = async () => {
    if (!templateId) return;

    try {
      // Update template metadata (name, rows, cols)
      await updateTemplate.mutateAsync({
        id: templateId,
        name: editor.templateName,
        rows: editor.rows,
        cols: editor.cols,
      });

      // Flatten cells and save
      const flatCells = editor.cells.flatMap((row) =>
        row.map((cell) => ({
          seat_map_id: templateId,
          row_idx: cell.row_idx,
          col_idx: cell.col_idx,
          label: cell.label,
          cell_type: cell.cell_type,
          attributes: cell.attributes,
        }))
      );

      await saveCells.mutateAsync({
        templateId,
        cells: flatCells,
      });

      toast.success(t('seatMapEditor.saved'));
    } catch {
      toast.error(t('seatMapEditor.saveError'));
    }
  };

  const handleLoadPreset = (preset: SeatMapPreset) => {
    editor.actions.loadPreset(preset.cells, preset.rows, preset.cols);
    editor.actions.setTemplateName(preset.name);
  };

  const isSaving = updateTemplate.isPending || saveCells.isPending;

  if (busLoading || cellsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/buses')}
          title={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Template name */}
        <Input
          value={editor.templateName}
          onChange={(e) => editor.actions.setTemplateName(e.target.value)}
          className="h-8 w-56 text-sm font-medium"
          placeholder={t('buses.seatMapTemplate')}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.actions.setZoom(editor.zoom - 10)}
            disabled={editor.zoom <= 50}
            title={t('seatMapEditor.zoom') + ' -'}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-10 text-center">
            {editor.zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.actions.setZoom(editor.zoom + 10)}
            disabled={editor.zoom >= 200}
            title={t('seatMapEditor.zoom') + ' +'}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={editor.actions.undo}
          disabled={!editor.canUndo}
          title={t('seatMapEditor.undo')}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={editor.actions.redo}
          disabled={!editor.canRedo}
          title={t('seatMapEditor.redo')}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Grid dimensions */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Grid3X3 className="h-3.5 w-3.5" />
          <span className="font-mono">
            {editor.rows} x {editor.cols}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preset buttons */}
        <PresetButton
          label={t('seatMapEditor.hummel')}
          preset={HUMMEL_28_1}
          onConfirm={handleLoadPreset}
          confirmTitle={t('seatMapEditor.presetConfirm')}
          confirmDescription={t('seatMapEditor.presetConfirmDescription')}
          confirmAction={t('common.confirm')}
          cancelAction={t('common.cancel')}
        />
        <PresetButton
          label={t('seatMapEditor.novermann')}
          preset={NOVERMANN_44_1}
          onConfirm={handleLoadPreset}
          confirmTitle={t('seatMapEditor.presetConfirm')}
          confirmDescription={t('seatMapEditor.presetConfirmDescription')}
          confirmAction={t('common.confirm')}
          cancelAction={t('common.cancel')}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Save */}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!editor.isDirty || isSaving || !templateId}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {t('common.save')}
        </Button>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <SeatMapCanvas
          cells={editor.cells}
          zoom={editor.zoom}
          selectedCells={editor.selectedCells}
          onCellClick={editor.actions.selectCell}
          onCellShiftClick={editor.actions.shiftSelectCell}
        />

        {/* Properties panel */}
        <CellPropertiesPanel
          selectedCells={selectedCellObjects}
          onUpdate={editor.actions.updateCells}
        />
      </div>
    </div>
  );
}

// --- Preset button with AlertDialog ---

interface PresetButtonProps {
  label: string;
  preset: SeatMapPreset;
  onConfirm: (preset: SeatMapPreset) => void;
  confirmTitle: string;
  confirmDescription: string;
  confirmAction: string;
  cancelAction: string;
}

function PresetButton({
  label,
  preset,
  onConfirm,
  confirmTitle,
  confirmDescription,
  confirmAction,
  cancelAction,
}: PresetButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelAction}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(preset)}>
            {confirmAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
