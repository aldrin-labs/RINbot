import {
  SurfdogLaunchpadSingleton,
  mainnetSurfdogConfig,
} from '@avernikoz/rinbot-sui-sdk';
import { SUI_PROVIDER_URL } from '../../sui.config';

export function getSurfdogLaunchpad(): SurfdogLaunchpadSingleton {
  const surfdog = SurfdogLaunchpadSingleton.getInstance(
    SUI_PROVIDER_URL,
    mainnetSurfdogConfig,
  );

  return surfdog;
}
