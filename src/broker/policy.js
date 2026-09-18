/**
 * ポリシー判定。**純粋関数のみ。**
 *
 * ここには LLM も、自然言語も、外部呼び出しも入れない。
 * 入力は構造化された要求と現在の集計だけ。出力は許可か拒否か。
 * プロンプトインジェクションの入り口を、構造として存在させないための境界。
 */

/** 設定の検証。壊れたポリシーで動き始めないようにする。 */
export function validatePolicy(p) {
  const errs = [];
  if (!p || typeof p !== 'object') return ['policy が object ではない'];
  if (!p.brokerAccount) errs.push('brokerAccount が無い');
  if (!p.agents || typeof p.agents !== 'object') errs.push('agents が無い');

  for (const [name, a] of Object.entries(p.agents ?? {})) {
    const l = a.limits ?? {};
    for (const k of ['perPaymentMaxDrops', 'dailyTotalMaxDrops']) {
      if (!/^\d+$/.test(String(l[k] ?? ''))) errs.push(`agents.${name}.limits.${k} は整数文字列が必要`);
    }
    if (l.newPayeesPerDay != null && !Number.isInteger(l.newPayeesPerDay)) {
      errs.push(`agents.${name}.limits.newPayeesPerDay は整数`);
    }
  }
  return errs;
}

/**
 * 支払い要求を判定する。
 *
 * @param {object} p
 * @param {object} p.policy       ポリシー全体
 * @param {string} p.agentName    どのエージェントか
 * @param {string} p.payTo        支払先アドレス（実行時に発見される）
 * @param {string} p.amountDrops  金額（drops、文字列）
 * @param {object} p.state        当日の集計 { spentDrops, payees: string[] }
 * @returns {{allow:boolean, reason:string, code:string}}
 */
export function decide({ policy, agentName, payTo, amountDrops, state }) {
  const deny = (code, reason) => ({ allow: false, code, reason });

  const agent = policy.agents?.[agentName];
  if (!agent) return deny('UNKNOWN_AGENT', `エージェント "${agentName}" はポリシーに存在しない`);

  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(payTo)) {
    return deny('BAD_PAYEE', '支払先アドレスの形式が不正');
  }
  if (!/^\d+$/.test(String(amountDrops)) || BigInt(amountDrops) <= 0n) {
    return deny('BAD_AMOUNT', '金額は正の整数（drops）である必要がある');
  }

  const amount = BigInt(amountDrops);
  const l = agent.limits ?? {};
  const payees = agent.payees ?? {};

  if (payees.denyList?.includes(payTo)) {
    return deny('DENYLISTED', 'この支払先は明示的に拒否されている');
  }

  // 金額の判定を先に行う。金額そのものが範囲外なら、支払先の事情は関係ない。
  if (amount > BigInt(l.perPaymentMaxDrops)) {
    return deny('OVER_PER_PAYMENT', `1回の上限 ${l.perPaymentMaxDrops} drops を超えている`);
  }

  const spent = BigInt(state.spentDrops ?? '0');
  if (spent + amount > BigInt(l.dailyTotalMaxDrops)) {
    return deny('OVER_DAILY', `本日の合計が上限 ${l.dailyTotalMaxDrops} drops を超える（使用済 ${spent}）`);
  }

  const known = payees.alwaysAllow?.includes(payTo) || state.payees.includes(payTo);
  if (!known) {
    if (!payees.autoApprove) {
      return deny('UNKNOWN_PAYEE', '未知の支払先。自動承認が無効なので人間の承認が要る');
    }
    const newToday = state.payees.filter((x) => !payees.alwaysAllow?.includes(x)).length;
    if (l.newPayeesPerDay != null && newToday >= l.newPayeesPerDay) {
      return deny('NEW_PAYEE_QUOTA', `本日の新規支払先が上限 ${l.newPayeesPerDay} 件に達している`);
    }
  }

  return { allow: true, code: 'OK', reason: known ? '承認済みの支払先' : '未知だがポリシー範囲内で自動承認' };
}
