import { router } from 'expo-router';

import { Screen, ScreenHeader } from '@/components/ui/screen';
import { WorkerForm } from '@/components/workers/worker-form';
import { useI18n } from '@/i18n';

export default function NewWorkerScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <ScreenHeader back title={t('workers.add')} />
      <WorkerForm onSaved={(id) => router.replace(`/worker/${id}`)} />
    </Screen>
  );
}
