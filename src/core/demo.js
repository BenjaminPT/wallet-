// Демо-режим: полностью офлайн-данные, никаких сетевых запросов и ключей.
export const DEMO_ADDRS = {
  evm: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  sol: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  ton: 'UQDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemo_x',
  tron: 'TDemoDemoDemoDemoDemoDemoDemoDemo12',
};
export const DEMO_BAL = { 'btc:native': 0.052, 'eth:native': 1.84, 'sol:native': 9.6, 'ton:native': 120, 'tron:native': 800, 'eth:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1250, 'bsc:native': 3.2 };
export const DEMO_PRICES = {
  bitcoin: { p: 100200, ch: 1.2 }, ethereum: { p: 2650, ch: -0.4 }, solana: { p: 145, ch: 5.1 },
  'the-open-network': { p: 3.1, ch: 0.8 }, tron: { p: 0.27, ch: -1.1 }, binancecoin: { p: 640, ch: 0.3 },
  'matic-network': { p: 0.45, ch: 0.2 }, 'usd-coin': { p: 1, ch: 0 }, tether: { p: 1, ch: 0 },
};
// детерминированный псевдо-график
export function demoChart(days, seed = 1) {
  const n = 60, out = [];
  let v = 100, s = seed * 9301 + days;
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    v += (s / 233280 - 0.46) * 5;
    out.push([now - (n - i) * (days * 86400000 / n), v]);
  }
  return out;
}
export const DEMO_TXS = [
  { id: 'demo1', net: 'eth', sym: 'ETH', dir: 'in', amount: 0.5, ts: Date.now() - 3600e3 * 5 },
  { id: 'demo2', net: 'btc', sym: 'BTC', dir: 'out', amount: 0.004, ts: Date.now() - 3600e3 * 30 },
  { id: 'demo3', net: 'sol', sym: 'SOL', dir: 'in', amount: 2, ts: Date.now() - 3600e3 * 54 },
  { id: 'demo4', net: 'eth', sym: 'USDC', dir: 'out', amount: 150, ts: Date.now() - 3600e3 * 90 },
];
