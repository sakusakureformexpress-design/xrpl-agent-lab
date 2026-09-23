/** 本ツール経由の取引を台帳から識別するためのタグ。採用状況を第三者が集計できる。 */
// 0x4C454153 = ASCII "LEAS"。値と注釈の一致をテストで固定している
// （初期実装で 1279414611 = 0x4C425153 = "LBQS" と誤記していた。testnet のみで
//  使用した値のため、メインネット公開前のこの時点で修正する）。
export const LEASH_SOURCE_TAG = 0x4c454153; // 1279607123

/** PaymentChannelClaim のフラグ */
export const TF_CLOSE = 0x00020000;
