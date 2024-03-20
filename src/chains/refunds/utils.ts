import { promises as fs } from 'fs';
import { REFUNDABLE_ACCOUNTS_DATA_JSON_PATH } from './config';
import { AffectedAddressRecord, AffectedAddressesMap } from './types';

export async function getAffectedAddressData(
  affectedAddress: string,
): Promise<AffectedAddressRecord | undefined> {
  const data = await fs.readFile(REFUNDABLE_ACCOUNTS_DATA_JSON_PATH, {
    encoding: 'utf-8',
  });

  const affectedAddressesMap = JSON.parse(data);

  if (!isAffectedAddressesMap(affectedAddressesMap)) {
    console.warn(
      '[getAffectedAddressData] Read from JSON data is not expected map.',
    );
    console.debug(
      '[getAffectedAddressData] affectedAddressesMap:',
      affectedAddressesMap,
    );

    return;
  }

  const affectedAddressData = affectedAddressesMap[affectedAddress];

  return affectedAddressData;
}

function isAffectedAddressRecord(data: unknown): data is AffectedAddressRecord {
  return (
    typeof data === 'object' &&
    data !== null &&
    'digests' in data &&
    Array.isArray(data.digests) &&
    data.digests.every((item: any) => typeof item === 'string') &&
    'amount' in data &&
    typeof data.amount === 'string'
  );
}

function isAffectedAddressesMap(data: unknown): data is AffectedAddressesMap {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    Object.entries(data).some(
      ([key, value]) =>
        typeof key !== 'string' || !isAffectedAddressRecord(value),
    )
  ) {
    return false;
  }

  return true;
}
