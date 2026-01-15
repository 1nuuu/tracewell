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
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', brandColor: '#375BD2', brandBgColor: '#E8EDFF' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', logo: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png', brandColor: '#FF007A', brandBgColor: '#FFE6F2' },
  { id: 'usd-coin', name: 'USD Coin', symbol: 'USDC', logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png', brandColor: '#2775CA', brandBgColor: '#E6F2FF' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', brandColor: '#F3BA2F', brandBgColor: '#FFF9E6' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', logo: 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369', brandColor: '#E84142', brandBgColor: '#FFE6E6' },
  { id: 'crypto-com-chain', name: 'Cronos', symbol: 'CRO', logo: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png', brandColor: '#103F68', brandBgColor: '#E6EDF5' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', logo: 'https://assets.coingecko.com/coins/images/16547/standard/arb.jpg', brandColor: '#28A0F0', brandBgColor: '#E6F4FF' }
]
