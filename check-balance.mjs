import { Connection, PublicKey } from '@solana/web3.js';
import config from './config.mjs';

const connection = new Connection(config.RPC_URL);
const wallet = new PublicKey('F6HhtGvP88vCfP5QeGLnA2wVTSjPcmCEsGXzYHPdTsrK');
const balance = await connection.getBalance(wallet);
console.log(`Balance: ${(balance / 1e9).toFixed(6)} SOL ($${((balance / 1e9) * 200).toFixed(2)})`);
