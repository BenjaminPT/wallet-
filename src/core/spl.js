// Минимальная работа с SPL-токенами без @solana/spl-token (в нём уязвимая зависимость bigint-buffer).
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYS = new PublicKey('11111111111111111111111111111111');

export const ataOf = (mint, owner) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), mint.toBuffer()], ATA)[0];

export function createAtaIdempotentIx(payer, ata, owner, mint) {
  const k = (pubkey, isSigner, isWritable) => ({ pubkey, isSigner, isWritable });
  return new TransactionInstruction({ programId: ATA, keys: [k(payer, true, true), k(ata, false, true), k(owner, false, false), k(mint, false, false), k(SYS, false, false), k(TOKEN, false, false)], data: Buffer.from([1]) });
}

export function transferCheckedIx(src, mint, dst, owner, amount, decimals) {
  const data = Buffer.alloc(10);
  data[0] = 12;
  data.writeBigUInt64LE(BigInt(amount), 1);
  data[9] = decimals;
  const k = (pubkey, isSigner, isWritable) => ({ pubkey, isSigner, isWritable });
  return new TransactionInstruction({ programId: TOKEN, keys: [k(src, false, true), k(mint, false, false), k(dst, false, true), k(owner, true, false)], data });
}

// количество токенов в данных аккаунта токена (u64 LE по смещению 64)
export const tokenAmount = (data) => new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(64, true);
