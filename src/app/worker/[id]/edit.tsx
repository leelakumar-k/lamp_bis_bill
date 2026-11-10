import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { WorkerForm } from '@/components/workers/worker-form';
import { deleteWorker, getWorker } from '@/db/workers';
import { useI18n } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';
import { useDb, useDbQuery, useRevalidateAll } from '@/providers/database';

export default function EditWorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const { t, workerName } = useI18n();
  const { data: worker, isLoading } = useDbQuery(['worker', id], (d) => getWorker(d, id));

  const remove = async () => {
    if (!worker) return;
    const ok = await confirm({
      title: t('detail.deleteTitle'),
      message: t('detail.deleteBody', { name: workerName(worker.id, worker) }),
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await deleteWorker(db, worker.id);
    await revalidateAll();
    router.replace('/workers');
  };

  return (
    <Screen>
      <ScreenHeader back title={t('workers.edit')} />
      {worker ? (
        <WorkerForm key={worker.id} worker={worker} onSaved={() => goBack(`/worker/${worker.id}`)} onDelete={remove} />
      ) : isLoading ? null : (
        <EmptyState icon="person-outline" title={t('detail.notFound')} />
      )}
    </Screen>
  );
}
