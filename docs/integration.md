# Forecast Contract Integration

> **Overview**: This document describes the integration between the Tracewell API and the OracleFeed smart contract on Ritual Chain. The API provides uint256-encoded values optimized for on-chain consumption via an off-chain keeper that batches and EIP-712-signs updates.

**Deployed contract**: `0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F` on Ritual Chain testnet (Chain ID 1979)

---

## Table of Contents

- [Architectural Design](#architectural-design)
- [API Endpoints](#api-endpoints)
  - [Smart Contract Endpoint](#smart-contract-endpoint)
  - [All Data Endpoint](#all-data-endpoint)
- [Data Processing](#data-processing)
- [Quick Reference](#quick-reference)

---

## Architectural Design

The following diagram illustrates the data flow from CoinGecko API through the Hono API to smart contracts:

```
          ┌──────────────────────────┐
          │   CoinGecko API v3       │
          └─────────────┬───────────┘
                        │
                        │ GET /coins/{id}
                        │ JSON Response:
                        │   market_data.current_price.usd
                        │   market_data.total_volume.usd
                        │   market_data.price_change_percentage_24h
                        ▼
          ┌──────────────────────────────────────┐
          │  Hono API: /api/features/:id         │
          │  (Smart Contract Endpoint)            │
          └─────────────┬────────────────────────┘
                        │
                        │ Processing:
                        │   1. Fetch from CoinGecko
                        │   2. Scale to 1e18 (unsigned):
                        │      - price * 1e6 * 1e18/1e6
                        │      - volume * 1e6 * 1e18/1e6
                        │      - |volatility| * 1e6 * 1e18/1e6
                        │      (absolute value, magnitude only)
                        │   3. Compute direction:
                        │      - 1 if volatility >= 0
                        │      - 0 if volatility < 0
                        │
                        │ Response (JSON):
                        │   {
                        │     "price": "uint256 string (unsigned)",
                        │     "volume": "uint256 string (unsigned)",
                        │     "volatility": "uint256 string (unsigned, magnitude)",
                        │     "direction": 0 | 1
                        │   }
                        │
                        │ tx (as owner):
                        ▼
       ┌──────────────────────────────────────┐
       │          PriceOracle Contract        │
       │──────────────────────────────────────│
       │  price       : uint256               │
       │  volume      : uint256               │
       │  volatility  : uint256               │
       │  direction   : uint256 (0 or 1)      │
       │                                      │
       │  updateFeatures(price, volume,       │
       │                 volatility, direction)│
       │                                      │
       │  getFeatures() → [p, v, vol, d]      │
       └───────────────────┬──────────────────┘
                           │
                           ▼
       ┌──────────────────────────────────────┐
       │          PriceForecast Contract      │
       │──────────────────────────────────────│
       │  takes features = [p, v, vol, d]    │
       │  builds LLM prompt that explains:    │
       │    - order & meaning of each value   │
       │    - scaling (1e18, all unsigned)     │
       │    - volatility is magnitude only     │
       │    - direction encoding (0=negative, │
       │                         1=positive) │
       │    - sign determined by direction      │
       │  → calls Ritual LLM precompile       │
       └───────────────────┬──────────────────┘
                           │
                           ▼
                  Prediction result (JSON)
```

---

## API Endpoints

### Smart Contract Endpoint

**`GET /api/features/:id`**

Returns only uint256-encoded values optimized for smart contract integration.

#### Request

```http
GET /api/features/bitcoin
```

#### Response

```json
{
  "price": "98070000000000000000000",
  "volume": "103710000000000000000000000",
  "volatility": "386000000000000000000",
  "direction": 0
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `price` | `string` | Current price in USD, scaled to 1e18 (uint256, unsigned) |
| `volume` | `string` | 24-hour trading volume in USD, scaled to 1e18 (uint256, unsigned) |
| `volatility` | `string` | 24-hour price change percentage magnitude, scaled to 1e18 (uint256, unsigned, magnitude only) |
| `direction` | `number` | Direction flag: `0` = negative, `1` = positive (indicates sign of volatility externally) |

---

### All Data Endpoint

**`GET /api/features/all/:id`**

Returns full response including human-readable display values and metadata.

#### Request

```http
GET /api/features/all/bitcoin
```

#### Response

```json
{
  "price": 98070.0,
  "volume": 103710000000,
  "volatility": -3.86,
  "direction": 0,
  "name": "Bitcoin",
  "symbol": "BTC",
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `price` | `number` | Current price in USD (display value) |
| `volume` | `number` | 24-hour trading volume in USD (display value) |
| `volatility` | `number` | 24-hour price change percentage (display value, signed) |
| `direction` | `number` | Direction flag: `0` = negative, `1` = positive |
| `name` | `string` | Cryptocurrency name |
| `symbol` | `string` | Cryptocurrency symbol |
| `lastUpdated` | `string` | ISO 8601 timestamp of last update |

> **Note**: The `volatility` field shows the signed value for display purposes. The `direction` field indicates the sign externally.

---

## Data Processing

The API processes data through the following steps:

### 1. Data Fetching

Fetches market data from CoinGecko API v3 for the specified cryptocurrency ID.

**Endpoint**: `GET https://api.coingecko.com/api/v3/coins/{id}`

**Required Fields**:
- `market_data.current_price.usd`
- `market_data.total_volume.usd`
- `market_data.price_change_percentage_24h`

### 2. Value Scaling

All values are scaled to 1e18 for uint256 compatibility:

```
price:    value * 1e6 * (1e18 / 1e6) = value * 1e18
volume:   value * 1e6 * (1e18 / 1e6) = value * 1e18
volatility: |value| * 1e6 * (1e18 / 1e6) = |value| * 1e18
```

**Why 1e6 first?** Provides precision for decimal values before scaling to 1e18.

### 3. Volatility Processing

Volatility is processed to extract magnitude and direction:

1. **Direction Calculation** (before taking absolute value):
   - `direction = 1` if `volatility >= 0` (price increased)
   - `direction = 0` if `volatility < 0` (price decreased)

2. **Magnitude Calculation**:
   - `volatilityMagnitude = Math.abs(volatility)`
   - Returns unsigned value (magnitude only)

### 4. Encoding

All uint256 values are returned as **unsigned strings** to:
- Avoid precision loss in JSON
- Maintain compatibility with smart contract uint256 types
- Enable direct conversion to `uint256` in Solidity

---

## Quick Reference

### Endpoint Comparison

| Feature | Smart Contract Endpoint | All Data Endpoint |
|---------|-------------------------|-------------------|
| **Path** | `/api/features/:id` | `/api/features/all/:id` |
| **Use Case** | Smart contract integration | Display & debugging |
| **Response Size** | Minimal (4 fields) | Complete (10 fields) |
| **Values** | uint256 strings only | Display + uint256 strings |
| **Optimized For** | On-chain consumption | Human readability |

### Direction Encoding

| Value | Meaning | Volatility Sign |
|-------|---------|-----------------|
| `0` | Negative | Price decreased |
| `1` | Positive | Price increased |

### Example Usage

#### Smart Contract Integration

```javascript
// Fetch data for smart contract
const response = await fetch('/api/features/bitcoin');
const data = await response.json();

// Use in contract call
await priceOracle.updateFeatures(
  data.price,      // uint256 string
  data.volume,     // uint256 string
  data.volatility, // uint256 string (magnitude)
  data.direction   // 0 or 1
);
```

#### Display Integration

```javascript
// Fetch data for display
const response = await fetch('/api/features/all/bitcoin');
const data = await response.json();

// Display formatted values
console.log(`Price: $${data.price.toLocaleString()}`);
console.log(`Volume: $${data.volume.toLocaleString()}`);
console.log(`Change: ${data.volatility > 0 ? '+' : ''}${data.volatility}%`);
```

---

## Error Handling

The API returns appropriate HTTP status codes:

| Status Code | Meaning | Example |
|-------------|----------|---------|
| `200` | Success | Valid coin ID |
| `400` | Bad Request | Invalid coin ID format |
| `404` | Not Found | Coin ID doesn't exist |
| `500` | Server Error | CoinGecko API failure or missing data |

**Error Response Format**:
```json
{
  "error": "Error message description"
}
```
