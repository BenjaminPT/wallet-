// Реестр сетей и токенов. cg = id в CoinGecko для цен.
export const NETS = {
  eth:  { id: 'eth',  fam: 'evm', name: 'Ethereum', sym: 'ETH',  chainId: 1,     rpc: 'https://ethereum-rpc.publicnode.com',         cg: 'ethereum',    color: '#627eea', explorer: 'https://etherscan.io/tx/' },
  bsc:  { id: 'bsc',  fam: 'evm', name: 'BNB Chain', sym: 'BNB', chainId: 56,    rpc: 'https://bsc-rpc.publicnode.com',              cg: 'binancecoin', color: '#f3ba2f', explorer: 'https://bscscan.com/tx/' },
  pol:  { id: 'pol',  fam: 'evm', name: 'Polygon',  sym: 'POL',  chainId: 137,   rpc: 'https://polygon-bor-rpc.publicnode.com',      cg: 'matic-network', color: '#8247e5', explorer: 'https://polygonscan.com/tx/' },
  arb:  { id: 'arb',  fam: 'evm', name: 'Arbitrum', sym: 'ETH',  chainId: 42161, rpc: 'https://arbitrum-one-rpc.publicnode.com',     cg: 'ethereum',    color: '#28a0f0', explorer: 'https://arbiscan.io/tx/' },
  opt:  { id: 'opt',  fam: 'evm', name: 'Optimism', sym: 'ETH',  chainId: 10,    rpc: 'https://optimism-rpc.publicnode.com',         cg: 'ethereum',    color: '#ff0420', explorer: 'https://optimistic.etherscan.io/tx/' },
  base: { id: 'base', fam: 'evm', name: 'Base',     sym: 'ETH',  chainId: 8453,  rpc: 'https://base-rpc.publicnode.com',             cg: 'ethereum',    color: '#0052ff', explorer: 'https://basescan.org/tx/' },
  btc:  { id: 'btc',  fam: 'btc', name: 'Bitcoin',  sym: 'BTC',  cg: 'bitcoin',      color: '#f7931a', api: 'https://blockstream.info/api',  explorer: 'https://blockstream.info/tx/' },
  sol:  { id: 'sol',  fam: 'sol', name: 'Solana',   sym: 'SOL',  cg: 'solana',       color: '#14f195', rpc: 'https://solana-rpc.publicnode.com', explorer: 'https://solscan.io/tx/' },
  ton:  { id: 'ton',  fam: 'ton', name: 'TON',      sym: 'TON',  cg: 'the-open-network', color: '#0098ea', api: 'https://toncenter.com/api/v2', explorer: 'https://tonviewer.com/transaction/' },
  tron: { id: 'tron', fam: 'tron', name: 'Tron',    sym: 'TRX',  cg: 'tron',         color: '#ff0013', api: 'https://api.trongrid.io', explorer: 'https://tronscan.org/#/transaction/' },
};

export const TESTNETS = {
  sepolia: { id: 'sepolia', fam: 'evm', name: 'Sepolia', sym: 'ETH', chainId: 11155111, rpc: 'https://ethereum-sepolia-rpc.publicnode.com', cg: null, color: '#9aa0ff', explorer: 'https://sepolia.etherscan.io/tx/', test: true },
};

const t = (net, sym, name, decimals, contract, cg = 'usd-coin', color = '#2775ca') => ({ net, sym, name, decimals, contract, cg, color });
export const TOKENS = [
  t('eth', 'USDC', 'USD Coin', 6, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  t('eth', 'USDT', 'Tether', 6, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'tether', '#26a17b'),
  t('bsc', 'USDT', 'Tether', 18, '0x55d398326f99059fF775485246999027B3197955', 'tether', '#26a17b'),
  t('bsc', 'USDC', 'USD Coin', 18, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'),
  t('pol', 'USDC', 'USD Coin', 6, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'),
  t('pol', 'USDT', 'Tether', 6, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 'tether', '#26a17b'),
  t('arb', 'USDC', 'USD Coin', 6, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
  t('arb', 'USDT', 'Tether', 6, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'tether', '#26a17b'),
  t('opt', 'USDC', 'USD Coin', 6, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'),
  t('opt', 'USDT', 'Tether', 6, '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 'tether', '#26a17b'),
  t('base', 'USDC', 'USD Coin', 6, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  t('sol', 'USDC', 'USD Coin', 6, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  t('sol', 'USDT', 'Tether', 6, 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'tether', '#26a17b'),
  t('tron', 'USDT', 'Tether', 6, 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 'tether', '#26a17b'),
];

export const allNets = (testnets) => ({ ...NETS, ...(testnets ? TESTNETS : {}) });
export const netOf = (id) => NETS[id] || TESTNETS[id];
export const assetId = (a) => `${a.net}:${a.contract || 'native'}`;

// нативные + токены как плоский список активов
export function assetList(testnets = false, custom = []) {
  const out = [];
  for (const n of Object.values(allNets(testnets))) {
    out.push({ net: n.id, sym: n.sym, name: n.name === 'Ethereum' || n.sym !== 'ETH' ? n.name : `ETH · ${n.name}`, decimals: n.fam === 'btc' ? 8 : n.fam === 'sol' ? 9 : n.fam === 'ton' ? 9 : n.fam === 'tron' ? 6 : 18, cg: n.cg, color: n.color, native: true });
  }
  for (const tk of TOKENS) out.push(tk);
  for (const c of custom) out.push(c);
  return out;
}

// удобные заглушки для чисел
export const famOfNet = (id) => netOf(id)?.fam;

TOKENS.forEach((x) => { if (x.sym === 'USDT' && (x.net === 'tron' || x.net === 'eth')) x.pin = true; });

// Стандарт токена для подписи: USDT · TRC20
const STD = { eth: 'ERC20', bsc: 'BEP20', pol: 'Polygon', arb: 'Arbitrum', opt: 'Optimism', base: 'Base', sol: 'SPL', tron: 'TRC20', sepolia: 'Sepolia' };
export const stdOf = (a) => STD[a.net] || '';
export const tag = (a) => (a.native ? netOf(a.net).name : `${a.name} · ${stdOf(a)}`);
export const label = (a) => (a.native ? a.sym : `${a.sym} · ${stdOf(a)}`);

// Настоящие логотипы: Trust Wallet assets (по сети/контракту), запасной вариант — набор cryptocurrency-icons.
// Картинки грузятся браузером пользователя напрямую, ничего не вшито в приложение.
const TW = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';
const TWF = { eth: 'ethereum', bsc: 'smartchain', pol: 'polygon', arb: 'arbitrum', opt: 'optimism', base: 'base', btc: 'bitcoin', sol: 'solana', ton: 'ton', tron: 'tron', sepolia: 'ethereum' };
export const chainLogo = (net) => `${TW}/${TWF[net] || 'ethereum'}/info/logo.png`;
export const iconUrls = (a) => {
  const net = a.net || a.id, out = [];
  if (a.contract) out.push(`${TW}/${TWF[net]}/assets/${a.contract}/logo.png`);
  else if (net) out.push(chainLogo(a.sym === 'ETH' ? 'eth' : net));
  if (a.sym) out.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@0.18.1/svg/color/${a.sym.toLowerCase()}.svg`);
  return out;
};
