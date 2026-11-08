// Сервисная комиссия Noir за переводы наружу. Прозрачна: показывается на экране подтверждения и описана в Условиях.
// Комиссия ВЫКЛЮЧЕНА, пока для сети не задан адрес получателя. Адреса задаются здесь (публичные адреса кошелька владельца).
// Правильность адресов проверяет test/fees.test.mjs в CI, опечатка не пройдёт сборку.
export const FEE = {
  sendBps: 30,                       // 0,3 % от суммы перевода (сверху, получатель получает ровно введённую сумму)
  minValue: 0.05,                    // не берём комиссию, если она меньше 0,05 в выбранной валюте (газ дороже)
  addrs: { evm: '', btc: '', sol: '', ton: '', tron: '' },
};
export const feeEnabled = (fam) => FEE.sendBps > 0 && !!FEE.addrs[fam];
export const feeAddr = (fam) => (feeEnabled(fam) ? FEE.addrs[fam] : null);

// Размер комиссии в единицах актива (число) или 0. price — цена одной единицы в выбранной валюте.
export function serviceFee({ fam, amount, price, decimals, exempt = false }) {
  if (exempt || !feeEnabled(fam) || !(amount > 0) || !(price > 0)) return 0;
  const step = 10 ** Math.min(decimals, 8);
  const fee = Math.floor(((amount * FEE.sendBps) / 10000) * step) / step;
  if (fee <= 0 || fee * price < FEE.minValue) return 0;
  if (fam === 'btc' && fee < 0.00001) return 0; // меньше 1000 сатоши: уйдёт в пыль
  return fee;
}
