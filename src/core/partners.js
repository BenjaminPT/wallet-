// Партнёры для покупки криптовалюты картой. Ключ партнёра публичный (его видно в адресной строке виджета).
// Пока ключ пуст, покупка не подключена. Деньги и данные карты обрабатывает партнёр, а не Noir.
export const PARTNERS = {
  ramp: { name: 'Ramp', hostApiKey: '', base: 'https://app.rampnetwork.com/' },
};
// Коды активов Ramp: СЕТЬ_ТИКЕР. После получения ключа сверьте со списком GET /host-api/assets.
const RAMP_CHAIN = { eth: 'ETH', bsc: 'BSC', pol: 'MATIC', arb: 'ARBITRUM', opt: 'OPTIMISM', base: 'BASE', sol: 'SOLANA', tron: 'TRON', ton: 'TON', btc: 'BTC' };
export const buyAvailable = () => !!PARTNERS.ramp.hostApiKey;
export function rampUrl({ net, sym, address }) {
  const p = PARTNERS.ramp, ch = RAMP_CHAIN[net];
  if (!p.hostApiKey || !ch || !address) return null;
  const u = new URL(p.base);
  u.searchParams.set('hostApiKey', p.hostApiKey);
  u.searchParams.set('hostAppName', 'Noir Wallet');
  u.searchParams.set('userAddress', address);
  u.searchParams.set('enabledCryptoAssets', `${ch}_${sym}`);
  u.searchParams.set('defaultAsset', `${ch}_${sym}`);
  return u.toString();
}
