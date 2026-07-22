# Tracewell

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.10-orange)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)

On-chain verified market data and traceable AI analysis for Ritual Chain. Signed price and volatility feeds are published on-chain via a keeper oracle, then interpreted by a Sovereign Agent whose reasoning, sources, and execution reliability are all recorded on-chain, not hidden behind a black box API.

## Credits

Tracewell is a fork of [Oracast Markets](https://github.com/RitualChain/oracast-markets) by RitualChain / Val Alexander, extended with on-chain signed feeds and traceable agent analysis.

![Tracewell Screenshot](public/og-image.png)

## ✨ Features

- **On-Chain Verified Feeds** — Signed price and volatility data published on-chain via a keeper oracle for verifiable provenance
- **Traceable AI Analysis** — Sovereign Agent interprets market data with full on-chain reasoning, sources, and execution reliability
- **Real-time Market Data** — Live cryptocurrency prices, volumes, and volatility from CoinGecko
- **Blockchain-Ready API** — uint256-encoded values scaled to 1e18 for direct smart contract consumption
- **Fallback Resilience** — Automatic failover to Coinbase API with intelligent caching
- **Naïve Forecasting** — Trend-based price predictions with 60-day backtested confidence scores
- **Modern UI** — Responsive, branded interface with per-token theming

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/1nuuu/tracewell.git
cd tracewell

# Install dependencies
bun install
# or: npm install

# Start development server
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 API Reference

### Smart Contract Endpoint

```http
GET /api/features/:id
```

Returns uint256-encoded values optimized for on-chain consumption:

```json
{
  "price": "97382000000000000000000",
  "volume": "110903448964000000000000000000",
  "volatility": "6173220000000000000",
  "direction": 1,
  "forecast": {
    "mean": "103555220000000000000000",
    "low": "97159526340000000000000",
    "high": "109950913660000000000000"
  },
  "fitness": "854200000000000000000"
}
```

### Display Endpoint

```http
GET /api/features/all/:id
```

Returns human-readable values with additional metadata:

```json
{
  "price": 97382.0,
  "volume": 110903448964,
  "volatility": 6.17,
  "direction": 1,
  "forecast": { "mean": 103555.22, "low": 97159.53, "high": 109950.91 },
  "fitness": 85.42,
  "name": "Bitcoin",
  "symbol": "BTC",
  "lastUpdated": "2026-01-15T12:00:00.000Z",
  "source": "coingecko"
}
```

### Other Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/coins/list` | Top 25 cryptocurrencies |
| `GET /api/price/:id` | Price only (uint256) |

See [docs/integration.md](docs/integration.md) for detailed API documentation.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User/Client   │────▶│   Next.js API    │────▶│  CoinGecko API  │
│                 │     │   (Hono Routes)  │     │   (Primary)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  In-Memory Cache │     │  Coinbase API   │
                        │   (TTL-based)    │     │   (Fallback)    │
                        └──────────────────┘     └─────────────────┘
                               │
                               │ Every 4 hours (GitHub Actions)
                               ▼
                        ┌──────────────────┐
                        │  Keeper Script   │
                        │  (EIP-712 sign)  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  OracleFeed.sol  │
                        │  (Ritual Chain)  │
                        │  On-chain oracle │
                        └──────────────────┘
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **API**: Hono.js 4.10
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Smart Contracts**: Solidity 0.8, Foundry, OpenZeppelin EIP-712
- **Keeper**: viem, bun, GitHub Actions
- **Chain**: Ritual Chain testnet (Chain ID 1979)

### Project Structure

```
tracewell/
├── app/
│   ├── api/[...route]/     # Hono API routes
│   ├── features/           # Main data display component
│   └── [..id]/             # Dynamic coin routes
├── components/ui/          # Reusable UI components
├── lib/                    # Utilities and constants
├── docs/                   # API documentation
├── public/                 # Static assets
├── contracts/              # Foundry project
│   ├── src/OracleFeed.sol  # On-chain signed data oracle
│   ├── test/               # 18 test cases
│   ├── script/             # Deploy scripts
│   └── scripts/            # EIP-712 verification
├── keeper/
│   └── updateFeed.ts       # Off-chain batch updater
└── .github/workflows/      # CI: scheduled keeper runs
```

## ⛓️ Smart Contract Integration

Tracewell includes a production OracleFeed contract on Ritual Chain testnet
that stores signed batch updates from an off-chain keeper:

- **Contract**: `0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F` ([explorer](https://explorer.ritualfoundation.org/address/0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F))
- **18 tokens** updated every 4 hours via GitHub Actions
- **EIP-712** signed batches with replay protection (strict nonce)
- **Fail-closed** design — entire batch reverts on any invalid entry

```solidity
// OracleFeed stores full feed data per token
struct FeedData {
    uint256 price;          // USD price scaled to 1e18
    uint256 volume;         // 24H USD volume scaled to 1e18
    uint256 volatility;     // 24H change % scaled to 1e18
    uint256 forecastMean;   // Forecast mean price
    uint256 forecastLow;    // Forecast low bound
    uint256 forecastHigh;   // Forecast high bound
    uint64 lastUpdated;     // Chain timestamp (ms)
}

function batchUpdate(
    bytes32[] calldata tokenIds,
    FeedData[] calldata data,
    uint256 nonce,
    uint256 deadline,
    bytes calldata signature  // EIP-712 signed by keeper
) external;
```

See [docs/integration.md](docs/integration.md) for detailed API documentation
and [docs/a2a.md](docs/a2a.md) for the AI agent integration guide.

## 🔧 Configuration

### Adding Tokens

Edit `lib/constants.ts` to add new cryptocurrencies:

```typescript
export const TOKEN_LIST_DEFAULT: Token[] = [
  {
    id: 'bitcoin',        // CoinGecko ID
    name: 'Bitcoin',
    symbol: 'BTC',
    logo: 'https://assets.coingecko.com/...',
    brandColor: '#F7931A',
    brandBgColor: '#FFF4E6',
  },
  // Add more tokens...
];
```

### Environment Variables

Copy `.env.example` to `.env.local` for custom configuration. See the file for available options.

## 📚 Documentation

- [API Integration Guide](docs/integration.md) — Detailed API documentation
- [Agent Integration (A2A)](docs/a2a.md) — Guide for AI agents and smart contracts
- [Security Audit](SECURITY_AUDIT.md) — Full security assessment

## 🚢 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/1nuuu/tracewell)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Deploy automatically

### Other Platforms

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

- See [SECURITY.md](SECURITY.md) for our security policy
- See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for the full security audit
- Report vulnerabilities to: yourinuu@gmail.com

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👤 Authors

Tracewell is maintained by [1nuuu](https://github.com/1nuuu), forked from [Oracast Markets](https://github.com/RitualChain/oracast-markets) by **Val Alexander** ([bunsdev.com](https://bunsdev.com)).

---

<p align="center">
  Built with ❖ for <a href="https://links.ritual.tools">Ritual Devs</a>
</p>
