import { getSuiProvider } from '@avernikoz/rinbot-sui-sdk';

export type SuiClient = ReturnType<typeof getSuiProvider>;

export type SuiTransactionBlockResponse = Awaited<
  ReturnType<SuiClient['signAndExecuteTransactionBlock']>
>;
