export const COIN_GECKO_API_URL = 'https://api.coingecko.com/api/v3'
export const COINBASE_API_URL = 'https://api.exchange.coinbase.com'

export interface Token {
  id: string
  name: string
  symbol: string
  logo: string
  brandColor: string
  brandBgColor: string
}

export const TOKEN_LIST_DEFAULT: Token[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', brandColor: '#F7931A', brandBgColor: '#FFF4E6' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', brandColor: '#627EEA', brandBgColor: '#EEF2FF' },
  { id: 'tether', name: 'Tether', symbol: 'USDT', logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', brandColor: '#26A17B', brandBgColor: '#E6F9F2' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', brandColor: '#F3BA2F', brandBgColor: '#FFF9E6' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', brandColor: '#9945FF', brandBgColor: '#F3E8FF' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', brandColor: '#23292F', brandBgColor: '#E8EAED' },
  { id: 'usd-coin', name: 'USD Coin', symbol: 'USDC', logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', brandColor: '#2775CA', brandBgColor: '#E6F2FF' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', brandColor: '#0033AD', brandBgColor: '#E6ECFF' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', brandColor: '#C2A633', brandBgColor: '#FFF9E6' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', brandColor: '#375BD2', brandBgColor: '#E8EDFF' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', brandColor: '#E84142', brandBgColor: '#FFE6E6' },
  { id: 'sui', name: 'Sui', symbol: 'SUI', logo: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png', brandColor: '#4DA2FF', brandBgColor: '#E6F2FF' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', brandColor: '#E6007A', brandBgColor: '#FFE6F5' },
  { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', logo: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png', brandColor: '#FFA409', brandBgColor: '#FFF6E6' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', logo: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png', brandColor: '#345D9D', brandBgColor: '#E6EDF7' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', logo: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png', brandColor: '#8DC351', brandBgColor: '#F0F8E6' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', logo: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png', brandColor: '#FF007A', brandBgColor: '#FFE6F2' },
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', logo: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg', brandColor: '#000000', brandBgColor: '#E6E6E6' },
  { id: 'aptos', name: 'Aptos', symbol: 'APT', logo: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png', brandColor: '#000000', brandBgColor: '#E6E6E6' },
  { id: 'monero', name: 'Monero', symbol: 'XMR', logo: 'https://assets.coingecko.com/coins/images/69/small/monero_logo.png', brandColor: '#FF6600', brandBgColor: '#FFF0E6' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', logo: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg', brandColor: '#28A0F0', brandBgColor: '#E6F4FF' },
  { id: 'cosmos', name: 'Cosmos Hub', symbol: 'ATOM', logo: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png', brandColor: '#2E3148', brandBgColor: '#E8E9ED' },
  { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', logo: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png', brandColor: '#0090FF', brandBgColor: '#E6F4FF' },
]
