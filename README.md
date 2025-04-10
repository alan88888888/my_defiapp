# DeFi APP

A decentralized finance (DeFi) application that allows users to provide liquidity, swap tokens, and earn rewards with time-locked staking features.

## Features

- **Token Swapping**: Swap between two tokens with automatic price calculation
- **Liquidity Provision**: Add and remove liquidity to the pool
- **Reward System**: Earn rewards based on your liquidity provision
- **Time-Locked Staking**: Lock your rewards for different time periods to earn higher rates
- **Account-Specific States**: Each wallet address maintains its own lock status and time period selection

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or any Web3 wallet
- Hardhat (for local development)
- Docker (optional, for containerized deployment)

## Project Structure

```
my_docker_image/
├── contracts/              # Smart contracts
│   ├── NewToken.sol       # ERC20 token implementation
│   └── Pool.sol           # Liquidity pool implementation
├── workspace/             # Main workspace directory
│   ├── contracts/         # Additional contracts
│   ├── frontend/         # React frontend application
│   │   ├── src/          # Source files
│   │   │   ├── App.js    # Main application component
│   │   │   ├── utils/    # Utility functions
│   │   │   ├── assets/   # Static assets
│   │   │   └── ...       # Other frontend files
│   │   └── public/       # Public static files
│   
├── scripts/              # Deployment scripts
├── test/                # Test files
├── artifacts/           # Compiled contracts
├── cache/              # Hardhat cache
├── hardhat.config.js   # Hardhat configuration
├── package.json        # Project dependencies
├── package-lock.json   # Lock file
└── Dockerfile         # Docker configuration
```

## Smart Contracts

### NewToken.sol
- ERC20 token implementation
- Features:
  - Standard ERC20 functionality
  - Minting capability
  - Transfer and approval functions

### Pool.sol
- Liquidity pool implementation
- Features:
  - Token swapping
  - Liquidity provision
  - Reward calculation
  - Time-locked staking
  - Reward rate calculation based on lock period:
    - 14 days: 5%
    - 31 days: 12%
    - 3 months: 40%
    - 6 months: 85%
    - 1 year: 180%

## Frontend Features

### Token Swapping
- Real-time price calculation
- Slippage protection
- Token balance display

### Liquidity Management
- Add liquidity with automatic token ratio calculation
- Remove liquidity with proportional token return
- LP token balance tracking

### Reward System
- Dynamic reward rates based on lock period
- Account-specific lock status
- Real-time countdown timer
- Locked state UI feedback

## Development

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Start local blockchain:
```bash
npx hardhat node
```

3. Deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/distributed.js --network localhost
```

4. Start frontend:
```bash
cd workspace/frontend
npm start
```

### Testing
```bash
npx hardhat test
```

## Security Considerations

- Smart contracts are audited
- Use of SafeMath for arithmetic operations
- Access control for critical functions
- Time-lock mechanism for reward withdrawal
