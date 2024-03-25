export const boostedRefundExportPrivateKeyWarnMessage =
  '✅ Before proceeding with boosted refund, please be aware that you will need to <i><b>export the private ' +
  'key of your current wallet</b></i>. Pressing the <b>Confirm</b> button will initiate the process of exporting ' +
  'the private key of your current wallet.\n\n⚠️ Boosted refund <i><b>without exporting the private key</b></i> ' +
  'may result in <i><b>loss of access to your current funds</b></i>.';

export enum RefundPhase {
  Addition = 1,
  Funding = 2,
  Claim = 3,
  Reclaim = 4,
}

export const BOOSTED_REFUND_EXAMPLE_FOR_USER_URL =
  'https://github.com/aldrin-labs/refund-contract/tree/booster-cap/examples';

export const MINIMUM_SUI_BALANCE_FOR_REFUND = 0.5;
