# Planner: CoinGecko API Integration

## Goal
Create an API endpoint that accepts a cryptocurrency ID and returns only three values:
- **Price** (USD)
- **Volume** (24H trading volume in USD)
- **Volatility** (24H price change percentage as volatility proxy)

## Implementation Plan

### ✅ Step 1: Plan Creation
- [x] Create detailed plan in planner.md

### ✅ Step 2: API Route Update
- [x] Update `/api/[...route]/route.ts` to handle coin ID parameter
- [x] Implement CoinGecko API call with dynamic ID
- [x] Extract only: price, volume, and volatility from response
- [x] Handle errors appropriately

### ✅ Step 3: Data Extraction
- [x] Extract `market_data.current_price.usd` for price
- [x] Extract `market_data.total_volume.usd` for volume  
- [x] Extract `market_data.price_change_percentage_24h_in_currency.usd` for volatility

### ✅ Step 4: Response Format
- [x] Ensure response only contains: `{ price, volume, volatility }`
- [x] Format numbers appropriately (decimals for price/volume, percentage for volatility)

### ✅ Step 5: Testing
- [x] Test with example ID: "ethereum"
- [x] Verify response format matches requirements
- [x] Test error handling with invalid IDs

## API Endpoint Structure
- **Input**: `/api/features/{id}` (e.g., `/api/features/ethereum`)
- **Output**: `{ price: number, volume: number, volatility: number }`

## CoinGecko API Details
- Base URL: `https://api.coingecko.com/api/v3/coins/{id}`
- Parameters: `localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false&vs_currency=usd`
- Response fields needed:
  - `market_data.current_price.usd` → price
  - `market_data.total_volume.usd` → volume
  - `market_data.price_change_percentage_24h_in_currency.usd` → volatility

## Implementation Summary

✅ **Completed**: API endpoint `/api/features/:id` has been implemented
- Accepts cryptocurrency ID as URL parameter (e.g., "ethereum", "bitcoin")
- Fetches data from CoinGecko API
- Extracts and returns only: `price`, `volume`, and `volatility`
- Includes error handling for invalid IDs and missing data
- Response format: `{ price: number, volume: number, volatility: number }`

**Example Usage:**
- Request: `GET /api/features/ethereum`
- Response: `{ "price": 3436.7, "volume": 1234567890, "volatility": -2.5 }`
