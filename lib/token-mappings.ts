// Mapping of Ticker Symbol -> { coingeckoId, coinbaseTicker }
// This list covers the top cryptocurrencies to ensure proper ID resolution across APIs
export interface TokenMapping {
  cg: string; // CoinGecko ID
  cb: string; // Coinbase Ticker
}

export const TOKEN_MAPPINGS: Record<string, TokenMapping> = {
  // Top 20+ Common Tokens
  BTC: { cg: 'bitcoin', cb: 'BTC' },
  BITCOIN: { cg: 'bitcoin', cb: 'BTC' },
  ETH: { cg: 'ethereum', cb: 'ETH' },
  ETHEREUM: { cg: 'ethereum', cb: 'ETH' },
  USDT: { cg: 'tether', cb: 'USDT' },
  BNB: { cg: 'binancecoin', cb: 'BNB' },
  SOL: { cg: 'solana', cb: 'SOL' },
  SOLANA: { cg: 'solana', cb: 'SOL' },
  XRP: { cg: 'ripple', cb: 'XRP' },
  RIPPLE: { cg: 'ripple', cb: 'XRP' },
  USDC: { cg: 'usd-coin', cb: 'USDC' },
  ADA: { cg: 'cardano', cb: 'ADA' },
  CARDANO: { cg: 'cardano', cb: 'ADA' },
  AVAX: { cg: 'avalanche-2', cb: 'AVAX' },
  AVALANCHE: { cg: 'avalanche-2', cb: 'AVAX' },
  DOGE: { cg: 'dogecoin', cb: 'DOGE' },
  DOGECOIN: { cg: 'dogecoin', cb: 'DOGE' },
  TRX: { cg: 'tron', cb: 'TRX' },
  TRON: { cg: 'tron', cb: 'TRX' },
  DOT: { cg: 'polkadot', cb: 'DOT' },
  POLKADOT: { cg: 'polkadot', cb: 'DOT' },
  LINK: { cg: 'chainlink', cb: 'LINK' },
  CHAINLINK: { cg: 'chainlink', cb: 'LINK' },
  MATIC: { cg: 'matic-network', cb: 'POL' }, // Coinbase migrated MATIC to POL
  POL: { cg: 'matic-network', cb: 'POL' },   
  POLYGON: { cg: 'matic-network', cb: 'POL' }, // Alias for Polygon
  TON: { cg: 'the-open-network', cb: 'TON' },
  DAI: { cg: 'dai', cb: 'DAI' },
  SHIB: { cg: 'shiba-inu', cb: 'SHIB' },
  SHIBA: { cg: 'shiba-inu', cb: 'SHIB' },
  LTC: { cg: 'litecoin', cb: 'LTC' },
  LITECOIN: { cg: 'litecoin', cb: 'LTC' },
  BCH: { cg: 'bitcoin-cash', cb: 'BCH' },
  LEO: { cg: 'leo-token', cb: 'LEO' },
  UNI: { cg: 'uniswap', cb: 'UNI' },
  UNISWAP: { cg: 'uniswap', cb: 'UNI' },
  ATOM: { cg: 'cosmos', cb: 'ATOM' },
  COSMOS: { cg: 'cosmos', cb: 'ATOM' },
  ETC: { cg: 'ethereum-classic', cb: 'ETC' },
  XLM: { cg: 'stellar', cb: 'XLM' },
  STELLAR: { cg: 'stellar', cb: 'XLM' },
  XMR: { cg: 'monero', cb: 'XMR' },
  MONERO: { cg: 'monero', cb: 'XMR' },
  OKB: { cg: 'okb', cb: 'OKB' },
  LDO: { cg: 'lido-dao', cb: 'LDO' },
  FIL: { cg: 'filecoin', cb: 'FIL' },
  FILECOIN: { cg: 'filecoin', cb: 'FIL' },
  HBAR: { cg: 'hedera-hashgraph', cb: 'HBAR' },
  HEDERA: { cg: 'hedera-hashgraph', cb: 'HBAR' },
  APT: { cg: 'aptos', cb: 'APT' },
  APTOS: { cg: 'aptos', cb: 'APT' },
  ARB: { cg: 'arbitrum', cb: 'ARB' },
  ARBITRUM: { cg: 'arbitrum', cb: 'ARB' },
  CRO: { cg: 'crypto-com-chain', cb: 'CRO' },
  NEAR: { cg: 'near', cb: 'NEAR' },
  VET: { cg: 'vechain', cb: 'VET' },
  VECHAIN: { cg: 'vechain', cb: 'VET' },
  QNT: { cg: 'quant-network', cb: 'QNT' },
  AAVE: { cg: 'aave', cb: 'AAVE' },
  OP: { cg: 'optimism', cb: 'OP' },
  OPTIMISM: { cg: 'optimism', cb: 'OP' },
  GRT: { cg: 'the-graph', cb: 'GRT' },
  ALGO: { cg: 'algorand', cb: 'ALGO' },
  ALGORAND: { cg: 'algorand', cb: 'ALGO' },
  STX: { cg: 'blockstack', cb: 'STX' },
  IMX: { cg: 'immutable-x', cb: 'IMX' },
  RNDR: { cg: 'render-token', cb: 'RNDR' },
  RENDER: { cg: 'render-token', cb: 'RNDR' },
  EOS: { cg: 'eos', cb: 'EOS' },
  SAND: { cg: 'the-sandbox', cb: 'SAND' },
  EGLD: { cg: 'elrond-erd-2', cb: 'EGLD' },
  THETA: { cg: 'theta-token', cb: 'THETA' },
  XTZ: { cg: 'tezos', cb: 'XTZ' },
  TEZOS: { cg: 'tezos', cb: 'XTZ' },
  FTM: { cg: 'fantom', cb: 'FTM' },
  FANTOM: { cg: 'fantom', cb: 'FTM' },
  MANA: { cg: 'decentraland', cb: 'MANA' },
  AXS: { cg: 'axie-infinity', cb: 'AXS' },
  FLOW: { cg: 'flow', cb: 'FLOW' },
  KAVA: { cg: 'kava', cb: 'KAVA' },
  NEO: { cg: 'neo', cb: 'NEO' },
  CHZ: { cg: 'chiliz', cb: 'CHZ' },
  CRV: { cg: 'curve-dao-token', cb: 'CRV' },
  KLAY: { cg: 'klay-token', cb: 'KLAY' },
  GALA: { cg: 'gala', cb: 'GALA' },
  MINA: { cg: 'mina-protocol', cb: 'MINA' },
  GNO: { cg: 'gnosis', cb: 'GNO' },
  PEPE: { cg: 'pepe', cb: 'PEPE' },
  SUI: { cg: 'sui', cb: 'SUI' },
  INJ: { cg: 'injective-protocol', cb: 'INJ' },
  RUNE: { cg: 'thorchain', cb: 'RUNE' },
  FXS: { cg: 'frax-share', cb: 'FXS' },
  LUNC: { cg: 'terra-luna', cb: 'LUNC' }, 
  WBTC: { cg: 'wrapped-bitcoin', cb: 'WBTC' },
  BSV: { cg: 'bitcoin-sv', cb: 'BSV' },
  MKR: { cg: 'maker', cb: 'MKR' },
  BTT: { cg: 'bittorrent', cb: 'BTT' },
  CAKE: { cg: 'pancakeswap-token', cb: 'CAKE' },
  XEC: { cg: 'ecash', cb: 'XEC' },
  MIOTA: { cg: 'iota', cb: 'IOTA' },
  IOTA: { cg: 'iota', cb: 'IOTA' },
  TWT: { cg: 'trust-wallet-token', cb: 'TWT' },
  FEI: { cg: 'fei-usd', cb: 'FEI' },
  ZEC: { cg: 'zcash', cb: 'ZEC' },
  HT: { cg: 'huobi-token', cb: 'HT' },
  DASH: { cg: 'dash', cb: 'DASH' },
  KCS: { cg: 'kucoin-shares', cb: 'KCS' },
  COMP: { cg: 'compound-governance-token', cb: 'COMP' },
  SNX: { cg: 'havven', cb: 'SNX' },
  ZIL: { cg: 'zilliqa', cb: 'ZIL' },
  BAT: { cg: 'basic-attention-token', cb: 'BAT' },
  LRC: { cg: 'loopring', cb: 'LRC' },
  ENJ: { cg: 'enjincoin', cb: 'ENJ' },
  XEM: { cg: 'nem', cb: 'XEM' },
  CELO: { cg: 'celo', cb: 'CELO' },
  HOT: { cg: 'holotoken', cb: 'HOT' },
  RVN: { cg: 'ravencoin', cb: 'RVN' },
  KSM: { cg: 'kusama', cb: 'KSM' },
  YFI: { cg: 'yearn-finance', cb: 'YFI' },
  WAVES: { cg: 'waves', cb: 'WAVES' },
  TFUEL: { cg: 'theta-fuel', cb: 'TFUEL' },
  AR: { cg: 'arweave', cb: 'AR' },
  ONE: { cg: 'harmony', cb: 'ONE' },
  QTUM: { cg: 'qtum', cb: 'QTUM' },
  GLM: { cg: 'golem', cb: 'GLM' },
  IOTX: { cg: 'iotex', cb: 'IOTX' },
  JST: { cg: 'just', cb: 'JST' },
  ANKR: { cg: 'ankr', cb: 'ANKR' },
  OMG: { cg: 'omg', cb: 'OMG' },
  ZRX: { cg: '0x', cb: 'ZRX' },
  ICX: { cg: 'icon', cb: 'ICX' },
  HIVE: { cg: 'hive', cb: 'HIVE' },
  ONT: { cg: 'ontology', cb: 'ONT' },
  IOST: { cg: 'iostoken', cb: 'IOST' },
  SC: { cg: 'siacoin', cb: 'SC' },
  WAXP: { cg: 'wax', cb: 'WAXP' },
  GLMR: { cg: 'moonbeam', cb: 'GLMR' },
  LPT: { cg: 'livepeer', cb: 'LPT' },
  AUDIO: { cg: 'audius', cb: 'AUDIO' },
  UMA: { cg: 'uma', cb: 'UMA' },
  SUSHI: { cg: 'sushi', cb: 'SUSHI' },
  SKL: { cg: 'skale', cb: 'SKL' },
  SCRT: { cg: 'secret', cb: 'SCRT' },
  DIGIBYTE: { cg: 'digibyte', cb: 'DGB' },
  DGB: { cg: 'digibyte', cb: 'DGB' },
  CVC: { cg: 'civic', cb: 'CVC' },
  SNT: { cg: 'status', cb: 'SNT' },
  REN: { cg: 'ren', cb: 'REN' },
  STORJ: { cg: 'storj', cb: 'STORJ' },
  RLC: { cg: 'iexec-rlc', cb: 'RLC' },
  NKN: { cg: 'nkn', cb: 'NKN' },
  OXT: { cg: 'orchid-protocol', cb: 'OXT' },
  // Add more mappings as needed
};

export function getIdsByTicker(ticker: string): TokenMapping | undefined {
  return TOKEN_MAPPINGS[ticker.toUpperCase()];
}

export function getIdsById(id: string): TokenMapping | undefined {
  // Search values for a matching CoinGecko ID
  return Object.values(TOKEN_MAPPINGS).find(m => m.cg === id);
}

// Helper to normalize IDs if exact ticker match isn't found
// CoinGecko often uses "name-token" or "name-protocol"
// Coinbase often uses just the ticker, but we need to guess something.
// If we don't know the ticker, we might default to uppercased input as the ticker?
export function guessIds(ticker: string, name?: string): TokenMapping {
  const lowerTicker = ticker.toLowerCase();
  const lowerName = name ? name.toLowerCase().replace(/\s+/g, '-') : lowerTicker;
  const upperTicker = ticker.toUpperCase();
  
  return {
    cg: lowerName, // Default guess for CoinGecko
    cb: upperTicker // Default guess for Coinbase (Ticker)
  };
}
