import { SessionData } from '../types';

export function addImportWalletForRefundField(old: SessionData) {
  return {
    ...old,
    refund: {
      ...old.refund,
      importedWalletFromRefund: false,
    },
  };
}
