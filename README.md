# DeFi APP

A decentralized finance (DeFi) application that allows users to provide liquidity, swap tokens, and earn rewards with time-locked staking features.

## Features

- **Token Swapping**: Swap between two tokens with automatic price calculation
- **Liquidity Provision**: Add and remove liquidity to the pool
- **Reward System**: Earn rewards based on your liquidity provision
- **Time-Locked Staking**: Lock your rewards for different time periods to earn higher rates
- **Account-Specific States**: Each wallet address maintains its own lock status and time period selection
- **pool balances and exchange result preview**: Pool balances and exchange result preview are accessible BEFORE connecting to the wallet

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or any Web3 wallet
- Hardhat (for local development)
- Docker (optional, for containerized deployment)

## Dependencies

### Backend Dependencies
```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^4.8.0",
    "hardhat": "^2.12.0",
    "ethers": "^5.7.2",
    "web3": "^1.8.0"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^2.0.0",
    "@nomiclabs/hardhat-ethers": "^2.2.0",
    "@nomiclabs/hardhat-waffle": "^2.0.3",
    "chai": "^4.3.6",
    "ethereum-waffle": "^3.4.4",
    "hardhat-gas-reporter": "^1.0.8"
  }
}
```

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web3": "^1.8.0",
    "ethers": "^5.7.2",
    "bootstrap": "^5.2.3",
    "react-bootstrap": "^2.7.0",
    "chart.js": "^4.2.0",
    "react-chartjs-2": "^5.2.0"
  }
}
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
# Network Configuration
NETWORK_URL=http://localhost:8545
CHAIN_ID=31337

# Contract Addresses (will be populated after deployment)
ALPHA_TOKEN_ADDRESS=
BETA_TOKEN_ADDRESS=
POOL_ADDRESS=

```

### Hardhat Configuration
The `hardhat.config.js` file includes:
- Network configurations (localhost, testnet, mainnet)
- Solidity compiler settings
- Gas reporter configuration
- Etherscan verification settings

### Frontend Configuration
The frontend configuration in `workspace/frontend/src/utils/contract.js` includes:
- Contract ABIs
- Contract addresses
- Network configurations
- Web3 provider settings

## Setup Guides

### Initial Setup
1. Clone the repository:
```bash
git clone https://github.com/alan88888888/my_defiapp.git
cd my_defiapp
```

2. Install dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd workspace/frontend
npm install
```

### Local Development Setup
1. Start a local blockchain:
```bash
npx hardhat node
```

2. Deploy contracts to local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/distributed_t.js --network localhost
```

3. Start the frontend development server:
```bash
cd workspace/frontend
npm start
```

## Project Structure

```
my_defiapp/
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
    - less than 14 days: 0%
    - 14 days: 5%
    - 31 days: 12%
    - 3 months: 40%
    - 6 months: 85%
    - 1 year: 180%

## Frontend Features

The frontend is built with React and provides a modern, user-friendly interface with the following features:

1. **Wallet Integration**
   - Connect your MetaMask wallet
   - View your token balances
   - Display your connected wallet address

2. **Token Swap**
   - Swap between Alpha and Beta tokens
   - Real-time price calculation
   - Input validation and error handling
   - Token selection with automatic balance updates

3. **Liquidity Management**
   - Add liquidity to the pool
   - Remove liquidity from the pool
   - View current pool statistics
   - Automatic calculation of required token amounts

4. **Reward System**
   - Time-locked staking with multiple lock periods:
     - 14 days (5% reward)
     - 31 days (12% reward)
     - 3 months (40% reward)
     - 6 months (85% reward)
     - 1 year (180% reward)
   - View your current rewards
   - Track lock period countdown
   - Claim rewards after lock period ends

5. **Data Visualization**
   - **Pool Statistics**
     - Bar chart showing Alpha and Beta token balances
     - Real-time updates of pool composition
   
   - **Reward Rates**
     - Line chart displaying reward rates for different lock periods
     - Visual comparison of reward percentages
   
   - **User Position**
     - Pie chart showing distribution of LP tokens, Alpha, and Beta holdings
     - Interactive display of your portfolio composition

   - **Transaction Analysis**
     - Bar chart tracking transaction volume (Swaps, Add/Remove Liquidity)
     - Historical data visualization
   
   - **Liquidity Trends**
     - Line chart showing liquidity changes over time
     - Comparison of Alpha and Beta token trends
   
   - **Reward Prediction**
     - Line chart forecasting potential rewards
     - Projections for different lock periods
   
   - **User Behavior Analysis**
     - Doughnut chart showing operation distribution
     - Breakdown of swap, liquidity, and lock activities

6. **Transaction History**
   - Detailed record of all operations
   - Filter by transaction type
   - Timestamp and amount information
   - Additional reward information for lock operations

7. **Responsive Design**
   - Mobile-friendly interface
   - Adaptive layout for different screen sizes
   - Consistent styling across devices

8. **User Interface**
   - Dark theme with neon blue accents
   - Intuitive navigation
   - Clear error messages and notifications
   - Loading states and progress indicators
