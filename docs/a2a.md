# Letting Agents Cook

## API Data Output and Smart Contract Integration Guide

This document provides AI agents with comprehensive information about the API data structure, how to consume it for smart contract updates, and how to evaluate forecast reliability using the provided metrics.

---

## API Endpoint: `/api/features/:id`

### Response Structure

The API returns a JSON object optimized for smart contract consumption:

```json
{
  "price": "97382000000000000000000",
  "volume": "110903448964000000000000000000",
  "volatility": "6173220000000000000",
  "direction": 0,
  "forecast": {
    "mean": "91370394900000000000000",
    "low": "85729899408000000000000",
    "high": "97010890392000000000000"
  },
  "fitness": "854200000000000000000"
}
```

### Field Descriptions

| Field | Type | Description | Smart Contract Usage |
|-------|------|-------------|---------------------|
| `price` | `string` | Current price in USD, scaled to 1e18 (uint256, unsigned) | Store as `uint256 price` |
| `volume` | `string` | 24-hour trading volume in USD, scaled to 1e18 (uint256, unsigned) | Store as `uint256 volume` |
| `volatility` | `string` | 24-hour price change percentage magnitude, scaled to 1e18 (uint256, unsigned) | Store as `uint256 volatility` |
| `direction` | `number` | Direction flag: `0` = negative, `1` = positive | Store as `uint256 direction` |
| `forecast.mean` | `string` | Forecasted mean price, scaled to 1e18 (uint256, unsigned) | Use for forecast validation |
| `forecast.low` | `string` | Forecast lower bound (±1 std dev), scaled to 1e18 | Use for range validation |
| `forecast.high` | `string` | Forecast upper bound (±1 std dev), scaled to 1e18 | Use for range validation |
| `fitness` | `string` | Backtest accuracy score (0-100), scaled to 1e18 | Use for reliability assessment |

---

## Smart Contract Integration

### State Variables

Your smart contract should store the following state variables:

```solidity
contract PriceOracle {
    uint256 public price;
    uint256 public volume;
    uint256 public volatility;
    uint256 public direction;
    
    // Optional: Store forecast and fitness for validation
    uint256 public forecastMean;
    uint256 public forecastLow;
    uint256 public forecastHigh;
    uint256 public fitness;
}
```

### Update Function

When calling the API and updating the contract:

1. **Fetch data** from `/api/features/:id`
2. **Parse uint256 strings** to `uint256` values
3. **Call contract update function** with the core values:

```solidity
function updateFeatures(
    uint256 _price,
    uint256 _volume,
    uint256 _volatility,
    uint256 _direction
) external onlyOwner {
    price = _price;
    volume = _volume;
    volatility = _volatility;
    direction = _direction;
}
```

### Data Conversion

All values are returned as strings to avoid precision loss. Convert them to `uint256`:

```javascript
// JavaScript/TypeScript example
const response = await fetch(`/api/features/${coinId}`);
const data = await response.json();

// Convert string to BigNumber/uint256
const price = BigInt(data.price);
const volume = BigInt(data.volume);
const volatility = BigInt(data.volatility);
const direction = BigInt(data.direction);

// Update contract
await contract.updateFeatures(price, volume, volatility, direction);
```

---

## Forecast Evaluation and Reliability Assessment

The API provides forecast data and fitness metrics that can be used to evaluate the **usefulness** and **reliability** of forecasts generated from these features.

### Understanding Forecast Components

#### 1. **Forecast Mean** (`forecast.mean`)

- **Purpose**: The expected forecasted price based on trend continuation
- **Calculation**: `price * (1 ± volatility/100)` based on direction
- **Usage for Evaluation**:
  - Compare your generated forecast against this naive baseline
  - If your forecast deviates significantly from the mean, validate the reasoning
  - Use as a sanity check: forecasts too far from mean may indicate errors

#### 2. **Forecast Range** (`forecast.low` to `forecast.high`)

- **Purpose**: Represents ±1 standard deviation from the mean (68% confidence interval)
- **Usage for Evaluation**:
  - **Range Validation**: If your generated forecast falls within this range, it's considered reasonable
  - **Outlier Detection**: Forecasts outside this range may be:
    - Too optimistic (above high) or too pessimistic (below low)
    - Require additional justification or validation
  - **Confidence Calibration**: Use the range width to assess market uncertainty
    - Narrow range = lower volatility = more confident forecast
    - Wide range = higher volatility = less confident forecast

#### 3. **Fitness Score** (`fitness`)

- **Purpose**: Historical accuracy metric from 60-day backtesting
- **Scale**: 0-100 (scaled to 1e18 in API response)
  - `100` = Perfect historical accuracy (0% MAPE)
  - `0` = Poor historical accuracy (≥100% MAPE)
- **Usage for Evaluation**:
  - **Reliability Indicator**: Higher fitness = more reliable forecast methodology
  - **Quality Threshold**: Set minimum fitness thresholds (e.g., >70) before accepting forecasts
  - **Comparative Analysis**: Compare fitness across different forecasting methods
  - **Risk Assessment**: Lower fitness indicates higher uncertainty in predictions

### Evaluation Workflow

When generating forecasts from the stored features, use this evaluation framework:

```
1. Generate Forecast
   ↓
2. Compare to Forecast Mean
   - Is it within reasonable range?
   - Does deviation make sense given market conditions?
   ↓
3. Check Forecast Range
   - Does your forecast fall within [low, high]?
   - If outside, provide justification
   ↓
4. Assess Fitness Score
   - Is fitness > threshold (e.g., 70)?
   - Does historical accuracy support this forecast?
   ↓
5. Final Validation
   - Combine all metrics for confidence score
   - Accept/reject/adjust forecast accordingly
```

### Practical Examples

#### Example 1: High Confidence Forecast
```json
{
  "fitness": "850000000000000000000",  // 85% - High reliability
  "forecast": {
    "mean": "100000000000000000000000",
    "low": "95000000000000000000000",   // Narrow range
    "high": "105000000000000000000000"
  }
}
```
**Interpretation**: High fitness + narrow range = reliable forecast. Your generated forecast should align closely with the mean.

#### Example 2: Low Confidence Forecast
```json
{
  "fitness": "450000000000000000000",  // 45% - Low reliability
  "forecast": {
    "mean": "100000000000000000000000",
    "low": "80000000000000000000000",   // Wide range
    "high": "120000000000000000000000"
  }
}
```
**Interpretation**: Low fitness + wide range = high uncertainty. Your forecast should:
- Be more conservative
- Include wider confidence intervals
- Require additional validation before use

### Best Practices

1. **Always check fitness first**: If fitness < 50, treat forecasts with extra caution
2. **Use range boundaries**: Forecasts outside [low, high] need strong justification
3. **Compare to mean**: Significant deviations from mean require explanation
4. **Combine metrics**: Don't rely on a single metric; use all three together
5. **Context matters**: Consider current market conditions alongside these metrics

---

## Summary

- **Core Data**: `price`, `volume`, `volatility`, `direction` → Store in smart contract state
- **Forecast Mean**: Use as baseline comparison for your generated forecasts
- **Forecast Range**: Validate your forecasts fall within reasonable bounds
- **Fitness Score**: Assess historical reliability before trusting forecasts

By using these metrics together, you can make informed decisions about forecast reliability and usefulness in your smart contract applications.
