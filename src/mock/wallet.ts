interface Token {
  coinAddress: string;
  coinName: string;
  coinTicker: string;
  balance: number;
}

interface Wallet {
  address: string;
  tokens: Token[];
}

export const walletData: Wallet = {
  address: '0xd01cb1b0c196042fde8af58e9b3208fe5e64d920bb3f9ace9064c4b7d8c64cf5',
  tokens: [
    {
      coinAddress:
        '0xbff8dc60d3f714f678cd4490ff08cabbea95d308c6de47a150c79cc875e0c7c6',
      coinName: 'sbox',
      coinTicker: 'SBOX',
      balance: 3000000000000,
    },
    {
      coinAddress:
        '0x47f389127ad7bfdd5b64dd532ba5e29495466c208b7ba2cc6a10a0a3a4610f3e',
      coinName: 'btcat',
      coinTicker: 'BTCAT',
      balance: 4239769033534,
    },
    {
      coinAddress:
        '0xf98e311a68e30562cb85a88b069714f9fd819ded2f55a510083fd03719dc2e1e',
      coinName: 'SUWING',
      coinTicker: 'SUWING',
      balance: 1000000000,
    },
  ],
};
