import { DCAManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import { SUI_PROVIDER_URL } from '../sui.config';

export function getDCAManager(): DCAManagerSingleton {
  const dcaManager = DCAManagerSingleton.getInstance(SUI_PROVIDER_URL);

  return dcaManager;
}
