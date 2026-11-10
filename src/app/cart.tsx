import { router } from 'expo-router';

import { CartPanel } from '@/components/pos/cart-panel';
import { Button } from '@/components/ui/button';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { useI18n } from '@/i18n';
import { goBack } from '@/lib/navigation';

export default function CartScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <ScreenHeader
        back
        title={t('pos.cart')}
        right={<Button label={t('pos.addMore')} icon="add" variant="soft" onPress={() => goBack('/')} />}
      />
      <CartPanel
        onSaved={(id, billed) => {
          if (billed) router.replace(`/order/${id}`);
          else goBack('/');
        }}
      />
    </Screen>
  );
}
