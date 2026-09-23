/**
 * ダッシュボードの静的な保存版を作る。
 *
 * サーバを立てずに共有・提出できる 1 ファイルの HTML。
 * データはその時点の台帳から取ったもので、以後更新されない。
 */
import { collect } from './data.js';
import { renderPage } from './render.js';

export async function snapshotHtml({ ownerAddress, policyPath, statePath }) {
  const data = await collect({ ownerAddress, policyPath, statePath });
  return { html: renderPage(data, { live: false }), data };
}
