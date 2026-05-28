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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { reorderQuestionsAction } from '@/features/quizzes/actions/reorder-questions';
import { QuestionDeleteButton } from '@/features/quizzes/components/question-delete-button';
import type { QuestionWithChoices } from '@/features/quizzes/data/questions';
import { useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'QUIZ_NOT_FOUND',
  'SET_MISMATCH',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];
function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

function rowsFromQuestions(questions: QuestionWithChoices[]): QuestionWithChoices[] {
  return questions.map((q) => ({
    id: q.id,
    body: q.body,
    order: q.order,
    points: q.points,
    type: q.type,
    choices: q.choices.map((c) => ({ ...c })),
  }));
}

export function SortableQuestionList({
  quizId,
  questions,
}: {
  quizId: string;
  questions: QuestionWithChoices[];
}) {
  const router = useRouter();
  const t = useTranslations('quizzes.questionList');
  const tToast = useTranslations('quizzes.toast');
  const tError = useTranslations('quizzes.errors');

  const [items, setItems] = useState<QuestionWithChoices[]>(() =>
    rowsFromQuestions(questions),
  );
  const [isPending, startTransition] = useTransition();

  // Sync local state when the server-side question set changes (sibling
  // delete or add triggered router.refresh()). React 19: derive in render.
  const questionsKey = questions.map((q) => q.id).join(',');
  const [syncedKey, setSyncedKey] = useState(questionsKey);
  if (syncedKey !== questionsKey) {
    setSyncedKey(questionsKey);
    setItems(rowsFromQuestions(questions));
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
      const result = await reorderQuestionsAction({
        quizId,
        orderedQuestionIds: next.map((row) => row.id),
      });
      if (!result.ok) {
        setItems(prev);
        toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
        return;
      }
      toast.success(tToast('questionsReordered'));
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
          {items.map((question, index) => (
            <SortableQuestionRow
              key={question.id}
              question={question}
              displayOrder={index + 1}
              disabled={isPending}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableQuestionRow({
  question,
  displayOrder,
  disabled,
}: {
  question: QuestionWithChoices;
  displayOrder: number;
  disabled: boolean;
}) {
  const t = useTranslations('quizzes.questionList');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

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
                aria-label={t('dragHandleAria', { order: displayOrder, body: question.body })}
                disabled={disabled}
                className="mt-0.5 inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true">⋮⋮</span>
              </button>
              <div className="grid gap-1">
                <CardTitle asChild>
                  <h3 className="text-base">
                    <span className="mr-2 text-muted-foreground">{displayOrder}.</span>
                    {question.body}
                  </h3>
                </CardTitle>
                <CardDescription>
                  {t('pointsLabel', { points: question.points })}
                  {' · '}
                  {question.type === 'MULTI_CHOICE' ? t('typeMulti') : t('typeSingle')}
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <QuestionDeleteButton
                questionId={question.id}
                questionBody={question.body}
                disabled={disabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul aria-label={t('choicesAria')} className="grid gap-1 text-sm">
            {question.choices.map((choice) => (
              <li
                key={choice.id}
                className={
                  choice.isCorrect
                    ? 'rounded bg-primary/10 px-2 py-1 text-primary'
                    : 'rounded px-2 py-1'
                }
              >
                <span className="mr-2 text-muted-foreground">
                  {String.fromCharCode(64 + choice.order)}.
                </span>
                {choice.body}
                {choice.isCorrect ? (
                  <span className="ml-2 text-xs font-medium">{t('correctMarker')}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </li>
  );
}
