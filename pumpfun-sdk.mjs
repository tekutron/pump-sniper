#!/usr/bin/env node
/**
 * pumpfun-sdk.mjs - Direct Pump.fun Bonding Curve Integration
 * Ultra-fast buy/sell via pump.fun program
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Pump.fun program constants
export const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FUN_GLOBAL_STATE = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
export const PUMP_FUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');

// Instruction discriminators (from program analysis)
const BUY_DISCRIMINATOR = Buffer.from([0x66, 0x06, 0x3d, 0x12, 0x01, 0xda, 0xeb, 0xea]); // buy instruction
const SELL_DISCRIMINATOR = Buffer.from([0x33, 0xe6, 0x85, 0xa4, 0x01, 0x7f, 0x83, 0xad]); // sell instruction

/**
 * PumpFunSDK - Direct bonding curve interaction
 */
export class PumpFunSDK {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Get bonding curve PDA for a token
   */
  async getBondingCurvePDA(mint) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      PUMP_FUN_PROGRAM
    )[0];
  }

  /**
   * Get associated bonding curve PDA
   */
  async getAssociatedBondingCurvePDA(mint) {
    return PublicKey.findProgramAddressSync(
      [
        PUMP_FUN_GLOBAL_STATE.toBuffer(),
        mint.toBuffer(),
        Buffer.from('associated-bonding-curve')
      ],
      PUMP_FUN_PROGRAM
    )[0];
  }

  /**
   * Buy tokens via pump.fun bonding curve
   * @param {string} mintAddress - Token mint address
   * @param {number} solAmount - Amount of SOL to spend
   * @param {number} slippageBps - Slippage in basis points (e.g., 1000 = 10%)
   * @param {number} priorityFeeLamports - Priority fee in lamports
   */
  async buyToken(mintAddress, solAmount, slippageBps = 1000, priorityFeeLamports = 1_000_000) {
    console.log(`\n🚀 Building PUMP.FUN BUY transaction...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${solAmount} SOL`);
    console.log(`   Slippage: ${slippageBps / 100}%`);

    try {
      const mint = new PublicKey(mintAddress);
      
      // Get associated token account for user
      const userTokenAccount = await getAssociatedTokenAddress(
        mint,
        this.wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get bonding curve accounts
      const bondingCurve = await this.getBondingCurvePDA(mint);
      const associatedBondingCurve = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();

      // Add compute budget (priority fee)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: Math.floor(priorityFeeLamports / 200_000) * 1_000_000 // Convert to microLamports per CU
        })
      );

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000 // Enough for buy + ATA creation if needed
        })
      );

      // Check if user token account exists
      const accountInfo = await this.connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        console.log(`   📝 Creating associated token account...`);
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            userTokenAccount,
            this.wallet.publicKey,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Build buy instruction
      const lamportsToSpend = Math.floor(solAmount * LAMPORTS_PER_SOL);
      // Use a reasonable max token amount instead of u64 max to avoid overflow
      const maxTokenAmount = BigInt(1_000_000_000_000_000); // 1 quadrillion tokens (reasonable upper bound)

      // Instruction data: [discriminator(8), lamports(8), max_tokens(8)]
      const instructionData = Buffer.concat([
        BUY_DISCRIMINATOR,
        this.u64ToBuffer(lamportsToSpend),
        this.u64ToBuffer(maxTokenAmount)
      ]);

      const buyInstruction = new TransactionInstruction({
        programId: PUMP_FUN_PROGRAM,
        keys: [
          { pubkey: PUMP_FUN_GLOBAL_STATE, isSigner: false, isWritable: false },
          { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: bondingCurve, isSigner: false, isWritable: true },
          { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
        ],
        data: instructionData
      });

      transaction.add(buyInstruction);

      // Send transaction
      const startTime = Date.now();
      console.log(`   📤 Sending transaction...`);
      
      const signature = await this.connection.sendTransaction(transaction, [this.wallet], {
        skipPreflight: true, // Skip preflight for maximum speed
        maxRetries: 3
      });

      const elapsed = Date.now() - startTime;
      console.log(`   ⚡ Transaction sent in ${elapsed}ms`);
      console.log(`   🔗 Signature: ${signature}`);

      // Don't wait for confirmation - return immediately for speed
      return {
        success: true,
        signature,
        mint: mintAddress,
        amountSol: solAmount,
        timestamp: Date.now(),
        executionTimeMs: elapsed,
        userTokenAccount: userTokenAccount.toBase58()
      };

    } catch (err) {
      console.error(`   ❌ Buy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }

  /**
   * Sell tokens via pump.fun bonding curve
   * @param {string} mintAddress - Token mint address
   * @param {number} tokenAmount - Amount of tokens to sell
   * @param {number} priorityFeeLamports - Priority fee in lamports
   */
  async sellToken(mintAddress, tokenAmount, priorityFeeLamports = 1_000_000) {
    console.log(`\n💰 Building PUMP.FUN SELL transaction...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${tokenAmount} tokens`);

    try {
      const mint = new PublicKey(mintAddress);

      // Get associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mint,
        this.wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get bonding curve accounts
      const bondingCurve = await this.getBondingCurvePDA(mint);
      const associatedBondingCurve = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();

      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: Math.floor(priorityFeeLamports / 200_000) * 1_000_000
        })
      );

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000
        })
      );

      // Build sell instruction
      const tokenAmountRaw = BigInt(Math.floor(tokenAmount * 1e9)); // Assuming 9 decimals
      const minSolOutput = BigInt(0); // Accept any amount (can add slippage calc here)

      // Instruction data: [discriminator(8), token_amount(8), min_sol(8)]
      const instructionData = Buffer.concat([
        SELL_DISCRIMINATOR,
        this.u64ToBuffer(tokenAmountRaw),
        this.u64ToBuffer(minSolOutput)
      ]);

      const sellInstruction = new TransactionInstruction({
        programId: PUMP_FUN_PROGRAM,
        keys: [
          { pubkey: PUMP_FUN_GLOBAL_STATE, isSigner: false, isWritable: false },
          { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: bondingCurve, isSigner: false, isWritable: true },
          { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
        ],
        data: instructionData
      });

      transaction.add(sellInstruction);

      // Send transaction
      const startTime = Date.now();
      console.log(`   📤 Sending transaction...`);

      const signature = await this.connection.sendTransaction(transaction, [this.wallet], {
        skipPreflight: true,
        maxRetries: 3
      });

      const elapsed = Date.now() - startTime;
      console.log(`   ⚡ Transaction sent in ${elapsed}ms`);
      console.log(`   🔗 Signature: ${signature}`);

      return {
        success: true,
        signature,
        mint: mintAddress,
        timestamp: Date.now(),
        executionTimeMs: elapsed
      };

    } catch (err) {
      console.error(`   ❌ Sell failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }

  /**
   * Get bonding curve price (price per token in SOL)
   */
  async getBondingCurvePrice(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      const bondingCurve = await this.getBondingCurvePDA(mint);
      
      // Fetch bonding curve account data
      const accountInfo = await this.connection.getAccountInfo(bondingCurve);
      if (!accountInfo) {
        return null;
      }

      // Parse bonding curve state (simplified - actual format may vary)
      // Real implementation would deserialize the account data properly
      const data = accountInfo.data;
      
      // Placeholder: return a calculated price based on bonding curve state
      // You'd need to reverse-engineer the exact data layout
      
      return {
        price: 0.0001, // Placeholder
        timestamp: Date.now()
      };

    } catch (err) {
      // Suppress rate limit error spam (already handled by connection retry logic)
      if (!err.message.includes('429') && !err.message.includes('rate limit')) {
        console.error('Error fetching bonding curve price:', err.message);
      }
      return null;
    }
  }

  /**
   * Helper: Convert number to u64 LE buffer
   */
  u64ToBuffer(value) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  }
}

export default PumpFunSDK;
