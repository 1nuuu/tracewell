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
  { id: 'solana', name: 'Solana', symbol: 'SOL', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', brandColor: '#9945FF', brandBgColor: '#F3E8FF' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', brandColor: '#F3BA2F', brandBgColor: '#FFF9E6' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', brandColor: '#23292F', brandBgColor: '#E8EAED' },
]
