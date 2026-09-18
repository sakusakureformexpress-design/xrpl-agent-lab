#!/usr/bin/env node
/**
 * XRPL Leash — MCP server (agent side)
 *
 * Exposes an agent's spending budgets as MCP tools, so any MCP-capable agent
 * framework can pay within limits a human set on the XRP Ledger.
 *
 * SECURITY MODEL
 *   This server holds the AGENT's signing key only. It never holds the
 *   treasury owner's account key, and it has no way to create, enlarge or
 *   redirect a budget. The checks it performs are a courtesy so the agent
 *   fails early with a clear message — the real enforcement is the ledger,
 *   which refuses an over-cap claim regardless of what this process does.
 *
 * ENV
 *   LEASH_OWNER_ADDRESS   the treasury owner's address (public information)
 *   LEASH_AGENT_SEED      this agent's own seed — NOT the owner's
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Wallet } from 'xrpl';
import { LeashAgent } from '../leash/agent.js';
import { LeashOwner } from '../leash/owner.js';

const OWNER = process.env.LEASH_OWNER_ADDRESS;
const SEED = process.env.LEASH_AGENT_SEED;

if (!OWNER || !SEED) {
  console.error('LEASH_OWNER_ADDRESS and LEASH_AGENT_SEED must be set.');
  console.error('LEASH_AGENT_SEED is the AGENT\'s own seed, never the treasury owner\'s.');
  process.exit(1);
}

const agentWallet = Wallet.fromSeed(SEED);
const agent = new LeashAgent({ privateKey: agentWallet.privateKey, publicKey: agentWallet.publicKey });

// listBudgets() only reads public ledger state, so a wallet-less view is enough.
const view = new LeashOwner({ address: OWNER, sign: () => { throw new Error('this process holds no owner key'); } });

const server = new McpServer({ name: 'xrpl-leash', version: '0.1.0' });

/**
 * 発行済みバウチャの累計額をチャネルごとに覚えておく。
 *
 * 台帳上の `balance` は**換金済みの額**でしかない。未換金のバウチャがある状態で
 * 台帳の値から次の累計額を計算すると、前のバウチャより小さい額を発行してしまい、
 * 支払先がその差額を回収できなくなる。
 * （Payment Channel のクレームは累計額なので、小さい額は上書きにならず単に無効）
 */
const issued = new Map();   // channelId -> 発行済みの最大累計額（XRP, string）

const maxXrp = (a, b) => (Number(a) >= Number(b) ? a : b);

/** Budgets whose signing key is this agent's. */
async function myBudgets() {
  const all = await view.listBudgets();
  // このエージェントの鍵で署名できる枠だけを返す。
  // publicKey が取れない枠を「自分のもの」と推定してはいけない
  // （他のエージェント宛の枠に対してバウチャを作ってしまう）。
  return all.filter((b) => b.publicKey === agent.publicKey);
}

server.registerTool(
  'list_budgets',
  {
    title: 'List spending budgets',
    description:
      'List the budgets this agent may spend from: who it may pay, the cap, how much is left. ' +
      'These limits are enforced by the XRP Ledger, not by this process.',
    inputSchema: {},
  },
  async () => {
    const budgets = await myBudgets();
    if (budgets.length === 0) {
      return { content: [{ type: 'text', text: 'No budgets. This agent cannot pay anyone until the treasury owner opens one.' }] };
    }
    const lines = budgets.map(
      (b) => `- ${b.payee}\n    cap ${b.capXrp} XRP · spent ${b.spentXrp} XRP · remaining ${b.remainingXrp} XRP` +
             (b.expiresAt ? `\n    expires ${b.expiresAt}` : ''),
    );
    return { content: [{ type: 'text', text: `Budgets (enforced on-chain):\n${lines.join('\n')}` }] };
  },
);

server.registerTool(
  'authorize_payment',
  {
    title: 'Authorize a payment',
    description:
      'Sign a payment voucher for an approved payee. Hand the returned voucher to that service; ' +
      'it redeems the voucher on the XRP Ledger. Paying anyone without a budget is impossible — ' +
      'there is no channel to sign against. Exceeding the cap is refused by the ledger.',
    inputSchema: {
      payee: z.string().describe('Address of the approved payee'),
      amountXrp: z.string().describe('Amount to pay now, in XRP, e.g. "0.5"'),
    },
  },
  async ({ payee, amountXrp }) => {
    const budgets = await myBudgets();
    const budget = budgets.find((b) => b.payee === payee);

    if (!budget) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `No budget exists for ${payee}. This agent cannot pay that address — ` +
                `there is no payment channel to sign against. Ask the treasury owner to open one.`,
        }],
      };
    }

    const amount = Number(amountXrp);
    const remaining = Number(budget.remainingXrp);
    if (!(amount > 0)) {
      return { isError: true, content: [{ type: 'text', text: 'amountXrp must be greater than zero.' }] };
    }
    if (amount > remaining) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Refused: ${amountXrp} XRP exceeds the ${budget.remainingXrp} XRP left in this budget. ` +
                `Submitting it anyway would be rejected by the ledger with tecUNFUNDED_PAYMENT.`,
        }],
      };
    }

    // Vouchers carry the cumulative total drawn from the channel, not the per-payment amount.
    // Base it on the highest voucher we have already issued, not only on what has been
    // redeemed on-ledger — otherwise an unredeemed voucher would be silently superseded
    // by a smaller one and the payee could not collect the difference.
    const base = maxXrp(budget.spentXrp, issued.get(budget.channelId) ?? '0');
    const cumulative = (Number(base) + amount).toString();

    if (Number(cumulative) > Number(budget.capXrp)) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Refused: this would bring the total drawn to ${cumulative} XRP, above the ` +
                `${budget.capXrp} XRP cap (${issued.get(budget.channelId) ?? '0'} XRP already authorized ` +
                `but not yet redeemed). The ledger would reject it with tecUNFUNDED_PAYMENT.`,
        }],
      };
    }

    const voucher = agent.authorize({ channelId: budget.channelId, cumulativeXrp: cumulative });
    issued.set(budget.channelId, cumulative);

    return {
      content: [{
        type: 'text',
        text:
          `Authorized ${amountXrp} XRP to ${payee}.\n` +
          `Cumulative authorized on this channel: ${cumulative} / ${budget.capXrp} XRP\n` +
          `Remaining: ${(Number(budget.capXrp) - Number(cumulative)).toFixed(6).replace(/\.?0+$/, '')} XRP\n\n` +
          `Send this voucher to the service:\n${JSON.stringify(voucher, null, 2)}`,
      }],
    };
  },
);

server.registerTool(
  'budget_status',
  {
    title: 'Check one budget',
    description: 'How much is left in the budget for a specific payee.',
    inputSchema: { payee: z.string().describe('Address of the payee') },
  },
  async ({ payee }) => {
    const budget = (await myBudgets()).find((b) => b.payee === payee);
    if (!budget) {
      return { content: [{ type: 'text', text: `No budget for ${payee}. This agent cannot pay that address.` }] };
    }
    return {
      content: [{
        type: 'text',
        text: `${payee}\n  cap ${budget.capXrp} XRP\n  spent ${budget.spentXrp} XRP\n  remaining ${budget.remainingXrp} XRP\n  used ${budget.usedPercent}%`,
      }],
    };
  },
);

await server.connect(new StdioServerTransport());
