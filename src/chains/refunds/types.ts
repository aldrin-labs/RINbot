export type AffectedAddressRecord = {
  digests: string[];
  amount: string;
};

export type AffectedAddressesMap = {
  [sender: string]: AffectedAddressRecord;
};
