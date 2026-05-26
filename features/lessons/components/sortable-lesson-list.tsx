'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { reorderLessonsAction } from '@/features/lessons/actions/reorder';
import { LessonDeleteButton } from '@/features/lessons/components/lesson-delete-button';
import type { LessonListItem } from '@/features/lessons/data/lessons';
import { Link, useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'COURSE_NOT_FOUND',
  'SET_MISMATCH',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];
function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

type Row = Pick<
  LessonListItem,
  'id' | 'title' | 'contentType' | 'isRequired'
>;

function rowsFromLessons(lessons: LessonListItem[]): Row[] {
  return lessons.map((l) => ({
    id: l.id,
    title: l.title,
    contentType: l.contentType,
    isRequired: l.isRequired,
  }));
}

export function SortableLessonList({
  lessons,
  courseId,
  courseSlug,
}: {
  lessons: LessonListItem[];
  courseId: string;
  courseSlug: string;
}) {
  const router = useRouter();
  const t = useTranslations('lessons.list');
  const tToast = useTranslations('lessons.toast');
  const tError = useTranslations('lessons.errors');

  // Local optimistic order. The visible "N." comes from array index, so the
  // numbering tracks the drag in real time. router.refresh() reconciles with
  // the server once the action commits.
  const [items, setItems] = useState<Row[]>(() => rowsFromLessons(lessons));
  const [isPending, startTransition] = useTransition();

  // Re-sync local state when the server-provided lesson set changes (e.g. a
  // sibling action like delete or add triggered router.refresh()). Keyed on
  // the joined id list so a pure-content edit (no id/order change) keeps the
  // current local state — and a reorder that already matches the server is a
  // no-op. Per React 19 guidance, derive in render rather than useEffect.
  const lessonsKey = lessons.map((l) => l.id).join(',');
  const [syncedKey, setSyncedKey] = useState(lessonsKey);
  if (syncedKey !== lessonsKey) {
    setSyncedKey(lessonsKey);
    setItems(rowsFromLessons(lessons));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
      >
        {t('empty')}
      </div>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((row) => row.id === active.id);
    const newIndex = items.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const prev = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);

    startTransition(async () => {
      const result = await reorderLessonsAction({
        courseId,
        orderedLessonIds: next.map((row) => row.id),
      });
      if (!result.ok) {
        // Rollback the optimistic move so the UI stays consistent with the DB.
        setItems(prev);
        toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
        return;
      }
      toast.success(tToast('reordered'));
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol aria-label={t('listAria')} className="grid gap-3">
          {items.map((row, index) => (
            <SortableLessonRow
              key={row.id}
              row={row}
              displayOrder={index + 1}
              courseSlug={courseSlug}
              disabled={isPending}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableLessonRow({
  row,
  displayOrder,
  courseSlug,
  disabled,
}: {
  row: Row;
  displayOrder: number;
  courseSlug: string;
  disabled: boolean;
}) {
  const t = useTranslations('lessons.list');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={t('dragHandleAria', { order: displayOrder, title: row.title })}
                disabled={disabled}
                className="mt-0.5 inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true">⋮⋮</span>
              </button>
              <div className="grid gap-1">
                <CardTitle asChild>
                  <h3>
                    <span className="mr-2 text-muted-foreground">{displayOrder}.</span>
                    {row.title}
                  </h3>
                </CardTitle>
                <CardDescription>
                  {row.isRequired ? t('required') : t('optional')}
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="sm" data-disabled={disabled || undefined}>
                <Link
                  href={`/instructor/courses/${courseSlug}/lessons/${displayOrder}/edit`}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : undefined}
                >
                  {t('edit')}
                </Link>
              </Button>
              <LessonDeleteButton
                lessonId={row.id}
                lessonTitle={row.title}
                courseSlug={courseSlug}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {t('contentTypeLabel', { type: row.contentType })}
        </CardContent>
      </Card>
    </li>
  );
}
