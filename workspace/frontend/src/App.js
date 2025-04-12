import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

/* User Interface */
import Logo from "./assets/icons/currency-exchange.svg"
import {Card, Tabs, Tab, Row, Col, Form, Button, Table} from 'react-bootstrap';

/* Interaction with Backend */
import { React, useState, useEffect } from 'react';
import { ethers } from 'ethers';  // Import ethers.js library
import { getAmountOut,getContracts, getPoolInfo, getTokenBalances, getRequiredAmount1, swapTokens, addLiquidity, getRewardsInfo, removeLiquidity } from './utils/contract';      // Import helper functions
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function App() {

  /* wallet related */
  const [isWalletConnected, setIsWalletConnected] = useState(false); // Track wallet connection
  const [account, setAccount] = useState(null);
	const [contracts, setContracts] = useState(null);
	const [provider, setProvider] = useState(null);

  /* balance related */
  const [balance0, setBalance0] = useState(0);
  const [balance1, setBalance1] = useState(0);
  const [poolInfo, setPoolInfo] = useState({ token0Balance: '0', token1Balance: '0' });

  /* rewards related */
  const [rewardsRate, setRewardsRate] = useState('0.3');
  const [totalRewards, setTotalRewards] = useState('0.00');
  const [userShare, setUserShare] = useState('0.00');
  const [userLPBalance, setUserLPBalance] = useState('0.00');
  const [selectedTimePeriods, setSelectedTimePeriods] = useState(new Map()); // Map to store time periods for different accounts
  const [lockStates, setLockStates] = useState(new Map());
  const [countdown, setCountdown] = useState('');

  /* swap related */
  const [fromToken, setFromToken] = useState('ALPHA');
  const [toToken, setToToken] = useState('BETA');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  /* add liquidity related */
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  
  /* remove liquidity related */
  const [lpAmountToRemove, setLpAmountToRemove] = useState('');
  
  // Add time period options
  const timePeriodOptions = [
    { value: 14, label: '14 Days' },
    { value: 31, label: '31 Days' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' }
  ];
  
  // switch token button
  const handleTokenSwitch = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setToAmount('');
  };

  const calculateOutputAmount = async (inputAmount, tokenIn, tokenOut) => {

    if (!inputAmount || !contracts || !tokenIn || !tokenOut) {
        return '0';
    }

    try {
        const mappedTokenIn = tokenIn === 'ALPHA' ? 'token0' : 'token1';
        const mappedTokenOut = tokenOut === 'ALPHA' ? 'token0' : 'token1';

        const result = await getAmountOut(
            contracts,
            mappedTokenIn,
            inputAmount,
            mappedTokenOut
        );
        return result;
    } catch (error) {
        console.error("Error calculating output amount:", error);
        return '0';
    }
  };

  const handleFromAmountChange = async (e) => {
    const value = e.target.value;
    setFromAmount(value);
    
    if (value && !isNaN(value)) {
        const output = await calculateOutputAmount(value, fromToken, toToken);
        setToAmount(output);
    } else {
        setToAmount('');
    }
  };

  const handleToken0AmountChange = async (e) => {
    const value = e.target.value;
    setToken0Amount(value);
    
    if (value && !isNaN(value)) {
        const token1Amount = await calculateToken1Amount(value);
        setToken1Amount(token1Amount);
    } else {
        setToken1Amount('');
    }
  };

  const calculateToken1Amount = async (amount0) => {
      if (!amount0 || !contracts || isNaN(amount0) || amount0 <= 0) {
          return '0';
      }

      try {
          const result = await getRequiredAmount1(contracts, amount0);
          return result;
      } catch (error) {
          console.error("Error calculating token1 amount:", error);
          return '0';
      }
  };

  const handleConnectWallet = async () => {
    try {
        if (!window.ethereum) {
            throw new Error("MetaMask not installed");
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        const initializedContracts = await getContracts(signer);
        
        setProvider(provider);
        setAccount(accounts[0]);
        setContracts(initializedContracts);
        setIsWalletConnected(true);

        // get balance
        const balances = await getTokenBalances(initializedContracts, accounts[0]);
        setBalance0(balances.token0);
        setBalance1(balances.token1);

        // get pool info
        const info = await getPoolInfo(initializedContracts);
        setPoolInfo(info);

        // get rewards info with selected time period
        const rewardsInfo = await getRewardsInfo(initializedContracts, accounts[0], getCurrentTimePeriod());
        setTotalRewards(rewardsInfo.totalRewards);
        setUserShare(rewardsInfo.userShare);
        setUserLPBalance(rewardsInfo.userLPBalance);
        setRewardsRate(rewardsInfo.rewardRate);

        alert(`Wallet connected!`);
      } catch (error) {
          console.error("Detailed connection error:", error);
          alert(`Failed to connect: ${error.message}`);
      }
  };

  // Add new state for transaction history
  const [transactionHistory, setTransactionHistory] = useState([]);

  // Modify handleLock function to include reward history
  const handleLock = async () => {
    if (account && !lockStates.has(account)) {
      const currentPeriod = getCurrentTimePeriod();
      const lockDuration = currentPeriod * 24 * 60 * 60 * 1000;
      const endTime = new Date().getTime() + lockDuration;
      const newLockStates = new Map(lockStates);
      newLockStates.set(account, { isLocked: true, endTime });
      setLockStates(newLockStates);

      // Calculate and add reward to history
      const rewardsInfo = await getRewardsInfo(contracts, account);
      const rewardRate = rewardsInfo.rewardRate;
      const userShare = rewardsInfo.userShare;
      const totalRewards = rewardsInfo.totalRewards;
      
      // Add reward to transaction history
      addTransactionToHistory('Reward', totalRewards, 'LP Tokens', `Rate: ${rewardRate}%`);
    }
  };

  // Modify addTransactionToHistory function to include additional info
  const addTransactionToHistory = (type, amount, token, additionalInfo = '') => {
    const newTransaction = {
      type,
      amount,
      token,
      additionalInfo,
      timestamp: new Date().toLocaleString(),
      id: Date.now()
    };
    setTransactionHistory(prev => [newTransaction, ...prev]);
  };

  const handleSwap = async () => {
    try {
      if (!contracts) return;

      const tokenIn = fromToken === 'ALPHA' ? 'token0' : 'token1';
      const tokenOut = toToken === 'ALPHA' ? 'token0' : 'token1';

      await swapTokens(contracts, tokenIn, fromAmount, tokenOut);

      // Add to transaction history
      addTransactionToHistory('Swap', fromAmount, fromToken);
      addTransactionToHistory('Swap', toAmount, toToken);

      // update balance
      const balances = await getTokenBalances(contracts, account);
      setBalance0(balances.token0);
      setBalance1(balances.token1);

      // update pool info
      const newPoolInfo = await getPoolInfo(contracts);
      setPoolInfo(newPoolInfo);

      alert('Swap completed successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to swap tokens');
    }
  };

  const handleAddLiquidity = async () => {
    try {
      if (!contracts || !account) {
        throw new Error("Contracts or account not initialized");
      }

      await addLiquidity(contracts, token0Amount);

      // Add to transaction history
      addTransactionToHistory('Add Liquidity', token0Amount, 'ALPHA');
      addTransactionToHistory('Add Liquidity', token1Amount, 'BETA');

      // update balance
      const balances = await getTokenBalances(contracts, account);
      setBalance0(balances.token0);
      setBalance1(balances.token1);

      // update pool info
      const newPoolInfo = await getPoolInfo(contracts);
      setPoolInfo(newPoolInfo);

      // update rewards info
      const rewardsInfo = await getRewardsInfo(contracts, account);
      setTotalRewards(rewardsInfo.totalRewards);
      setUserShare(rewardsInfo.userShare);
      setUserLPBalance(rewardsInfo.userLPBalance);

      // Clear input fields
      setToken0Amount('');
      setToken1Amount('');

      alert("Liquidity added successfully!");
    } catch (error) {
      console.error("Detailed error:", error);
      alert(`Failed to add liquidity: ${error.message}`);
    }
  };

  const handleRemoveLiquidity = async () => {
    try {
      if (!contracts || !account) {
        throw new Error("Contracts or account not initialized");
      }

      await removeLiquidity(contracts, lpAmountToRemove);

      // Add to transaction history
      addTransactionToHistory('Remove Liquidity', lpAmountToRemove, 'LP Tokens');

      // update balance
      const balances = await getTokenBalances(contracts, account);
      setBalance0(balances.token0);
      setBalance1(balances.token1);

      // update pool info
      const newPoolInfo = await getPoolInfo(contracts);
      setPoolInfo(newPoolInfo);

      // update rewards info
      const rewardsInfo = await getRewardsInfo(contracts, account);
      setTotalRewards(rewardsInfo.totalRewards);
      setUserShare(rewardsInfo.userShare);
      setUserLPBalance(rewardsInfo.userLPBalance);

      // Clear input field
      setLpAmountToRemove('');

      alert("Liquidity removed successfully!");
    } catch (error) {
      console.error("Detailed error:", error);
      alert(`Failed to remove liquidity: ${error.message}`);
    }
  };

  // Helper function to get current account's time period
  const getCurrentTimePeriod = () => {
    return account && selectedTimePeriods.has(account) 
      ? selectedTimePeriods.get(account) 
      : 14; // Default to 14 days if not set
  };

  // Helper function to set current account's time period
  const setCurrentTimePeriod = (period) => {
    if (account) {
      const newSelectedTimePeriods = new Map(selectedTimePeriods);
      newSelectedTimePeriods.set(account, period);
      setSelectedTimePeriods(newSelectedTimePeriods);
    }
  };

  // Modify handleTimePeriodChange
  const handleTimePeriodChange = async (e) => {
    const newTimePeriod = parseInt(e.target.value);
    setCurrentTimePeriod(newTimePeriod);
    
    if (contracts && account) {
      const rewardsInfo = await getRewardsInfo(contracts, account, newTimePeriod);
      setTotalRewards(rewardsInfo.totalRewards);
      setRewardsRate(rewardsInfo.rewardRate);
    }
  };

  // Add useEffect for countdown timer
  useEffect(() => {
    let timer;
    if (account && lockStates.has(account)) {
      const lockState = lockStates.get(account);
      if (lockState.isLocked && lockState.endTime) {
        timer = setInterval(() => {
          const now = new Date().getTime();
          const distance = lockState.endTime - now;
          
          if (distance < 0) {
            clearInterval(timer);
            const newLockStates = new Map(lockStates);
            newLockStates.delete(account);
            setLockStates(newLockStates);
            setCountdown('');
          } else {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          }
        }, 1000);
      }
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [account, lockStates]);

  // Helper function to check if current account is locked
  const isCurrentAccountLocked = () => {
    return account && lockStates.has(account) && lockStates.get(account).isLocked;
  };

  // Add new state variables for charts
  const [poolChartData, setPoolChartData] = useState({
    labels: ['Alpha', 'Beta'],
    datasets: [{
      label: 'Pool Balance',
      data: [0, 0],
      backgroundColor: ['#00FFFF', '#00BFFF'],
      borderColor: ['#00FFFF', '#00BFFF'],
      borderWidth: 1
    }]
  });

  const [rewardChartData, setRewardChartData] = useState({
    labels: ['14 Days', '31 Days', '3 Months', '6 Months', '1 Year'],
    datasets: [{
      label: 'Reward Rate (%)',
      data: [5, 12, 40, 85, 180],
      backgroundColor: 'rgba(0, 255, 255, 0.5)',
      borderColor: '#00FFFF',
      borderWidth: 1
    }]
  });

  const [userPositionData, setUserPositionData] = useState({
    labels: ['LP Tokens', 'Alpha', 'Beta'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#00FFFF', '#00BFFF', '#0080FF']
    }]
  });

  // Add useEffect to update chart data when pool info changes
  useEffect(() => {
    if (poolInfo) {
      setPoolChartData({
        ...poolChartData,
        datasets: [{
          ...poolChartData.datasets[0],
          data: [poolInfo.token0Balance, poolInfo.token1Balance]
        }]
      });
    }
  }, [poolInfo]);

  // Add useEffect to update user position data
  useEffect(() => {
    if (userLPBalance && balance0 && balance1) {
      setUserPositionData({
        ...userPositionData,
        datasets: [{
          ...userPositionData.datasets[0],
          data: [userLPBalance, balance0, balance1]
        }]
      });
    }
  }, [userLPBalance, balance0, balance1]);

  // Add new state variables for analysis charts
  const [volumeChartData, setVolumeChartData] = useState({
    labels: ['Swap', 'Add Liquidity', 'Remove Liquidity'],
    datasets: [{
      label: 'Transaction Volume',
      data: [0, 0, 0],
      backgroundColor: ['#00FFFF', '#00BFFF', '#0080FF'],
      borderColor: ['#00FFFF', '#00BFFF', '#0080FF'],
      borderWidth: 1
    }]
  });

  const [liquidityTrendData, setLiquidityTrendData] = useState({
    labels: ['Initial', 'Current'],
    datasets: [{
      label: 'Alpha',
      data: [0, 0],
      borderColor: '#00FFFF',
      tension: 0.1
    }, {
      label: 'Beta',
      data: [0, 0],
      borderColor: '#00BFFF',
      tension: 0.1
    }]
  });

  const [rewardPredictionData, setRewardPredictionData] = useState({
    labels: ['14 Days', '31 Days', '3 Months', '6 Months', '1 Year'],
    datasets: [{
      label: 'Predicted Rewards',
      data: [0, 0, 0, 0, 0],
      backgroundColor: 'rgba(0, 255, 255, 0.2)',
      borderColor: '#00FFFF',
      borderWidth: 1
    }]
  });

  const [userBehaviorData, setUserBehaviorData] = useState({
    labels: ['Swaps', 'Liquidity Add', 'Liquidity Remove', 'Locks'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#00FFFF', '#00BFFF', '#0080FF', '#0066CC']
    }]
  });

  // Add useEffect to update analysis data
  useEffect(() => {
    // Update volume chart data based on transaction history
    const swapCount = transactionHistory.filter(t => t.type === 'Swap').length;
    const addLiquidityCount = transactionHistory.filter(t => t.type === 'Add Liquidity').length;
    const removeLiquidityCount = transactionHistory.filter(t => t.type === 'Remove Liquidity').length;

    setVolumeChartData({
      ...volumeChartData,
      datasets: [{
        ...volumeChartData.datasets[0],
        data: [swapCount, addLiquidityCount, removeLiquidityCount]
      }]
    });

    // Update liquidity trend data
    if (poolInfo) {
      setLiquidityTrendData({
        ...liquidityTrendData,
        datasets: [{
          ...liquidityTrendData.datasets[0],
          data: [0, parseFloat(poolInfo.token0Balance)]
        }, {
          ...liquidityTrendData.datasets[1],
          data: [0, parseFloat(poolInfo.token1Balance)]
        }]
      });
    }

    // Update reward prediction data
    if (userLPBalance) {
      const predictions = [5, 12, 40, 85, 180].map(rate => 
        (parseFloat(userLPBalance) * rate) / 100
      );
      setRewardPredictionData({
        ...rewardPredictionData,
        datasets: [{
          ...rewardPredictionData.datasets[0],
          data: predictions
        }]
      });
    }

    // Update user behavior data
    const lockCount = transactionHistory.filter(t => t.type === 'Reward').length;
    setUserBehaviorData({
      ...userBehaviorData,
      datasets: [{
        ...userBehaviorData.datasets[0],
        data: [swapCount, addLiquidityCount, removeLiquidityCount, lockCount]
      }]
    });
  }, [transactionHistory, poolInfo, userLPBalance]);
  
  return (
    <div className="App" style={{ 
      backgroundColor: '#0A0A0A', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0.4rem',
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
    }}>
      {/* Navigation Bar */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.6rem 0.8rem',
        marginBottom: '0.4rem',
        background: 'rgba(18, 18, 18, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        boxShadow: '0 4px 16px rgba(0, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src={Logo} style={{ width: '20px', height: '20px', opacity: 0.8 }}/>
          </div>
          <span style={{
            color: '#00FFFF',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}>
            DeFi App
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem'
        }}>
          {isWalletConnected ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                background: 'rgba(0, 255, 255, 0.05)',
                borderRadius: '10px',
                border: '1px solid rgba(0, 255, 255, 0.1)'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#00FFFF',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #00FFFF'
                }}></div>
                <span style={{ color: '#E0E0E0', fontSize: '0.8rem' }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                style={{
                  borderColor: '#00FFFF',
                  color: '#00FFFF',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: '10px',
                  transition: 'all 0.3s ease',
                  background: 'rgba(0, 255, 255, 0.03)',
                  '&:hover': {
                    background: 'rgba(0, 255, 255, 0.1)',
                    borderColor: '#00FFFF'
                  }
                }}
                onClick={() => {
                  setIsWalletConnected(false);
                  setAccount(null);
                  setContracts(null);
                  setProvider(null);
                  setBalance0(0);
                  setBalance1(0);
                }}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="outline-primary"
              size="sm"
              style={{
                borderColor: '#00FFFF',
                color: '#00FFFF',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                borderRadius: '10px',
                transition: 'all 0.3s ease',
                background: 'rgba(0, 255, 255, 0.03)',
                '&:hover': {
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderColor: '#00FFFF'
                }
              }}
              onClick={handleConnectWallet}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      <header className="App-header" style={{ 
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          width: '100%',
          minHeight: 'calc(100vh - 0.8rem)',
          justifyContent: 'center'
        }}>
          {/* Left Side - Info Cards */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            width: '280px',
            flexShrink: 0
          }}>
      <Card
              border="primary"
        bg="dark"
              key="pool-card"
        text="white"
              style={{ 
                background: 'rgba(18, 18, 18, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
                borderRadius: '24px',
                transition: 'all 0.3s ease',
                flex: 1,
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)'
                }
              }}
            >
              <Card.Body style={{ padding: '0.8rem' }}>
                <Card.Title style={{ 
                  color: '#00FFFF', 
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  marginBottom: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#00FFFF" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
                    <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                  </svg>
                  Liquidity Pool
                </Card.Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.8rem',
                    background: 'rgba(0, 255, 255, 0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(0, 255, 255, 0.05)'
                    }
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: 'rgba(0, 255, 255, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00FFFF',
                        fontWeight: 'bold'
                      }}>A</div>
                      <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>ALPHA</span>
                    </div>
                    <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{Number(poolInfo.token0Balance).toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.8rem',
                    background: 'rgba(0, 255, 255, 0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(0, 255, 255, 0.05)'
                    }
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: 'rgba(0, 255, 255, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00FFFF',
                        fontWeight: 'bold'
                      }}>B</div>
                      <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>BETA</span>
                    </div>
                    <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{Number(poolInfo.token1Balance).toFixed(2)}</span>
                  </div>
                </div>
      </Card.Body>
    </Card>

            {isWalletConnected && (
              <>
      <Card
                  border="primary"
        bg="dark"
        key="balances-card"
        text="white"
                  style={{ 
                    background: 'rgba(18, 18, 18, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
                    borderRadius: '24px',
                    transition: 'all 0.3s ease',
                    flex: 1,
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)'
                    }
                  }}
                >
                  <Card.Body style={{ padding: '0.8rem' }}>
                    <Card.Title style={{ 
                      color: '#00FFFF', 
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#00FFFF" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
                        <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                      </svg>
                      My Balances
          </Card.Title>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>A</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>ALPHA</span>
                        </div>
                        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{Number(balance0).toFixed(2)}</span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>B</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>BETA</span>
                        </div>
                        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{Number(balance1).toFixed(2)}</span>
                      </div>
                    </div>
      </Card.Body>
    </Card>

      <Card
                  border="primary"
                  bg="dark"
                  key="rewards-card"
                  text="white"
                  style={{ 
                    background: 'rgba(18, 18, 18, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
                    borderRadius: '24px',
                    transition: 'all 0.3s ease',
                    flex: 1,
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)'
                    }
                  }}
                >
                  <Card.Body style={{ padding: '0.8rem' }}>
                    <Card.Title style={{ 
                      color: '#00FFFF', 
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#00FFFF" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
                        <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                      </svg>
                      LP Rewards
                    </Card.Title>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>L</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>My LPToken</span>
                        </div>
                        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{Number(userLPBalance).toFixed(2)}</span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '0.4rem',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>R</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>Rewards Rate</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Form.Select
                            value={getCurrentTimePeriod()}
                            onChange={handleTimePeriodChange}
                            disabled={isCurrentAccountLocked()}
                            style={{
                              background: 'rgba(18, 18, 18, 0.8)',
                              border: '1px solid rgba(0, 255, 255, 0.3)',
                              color: '#00FFFF',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              padding: '0.4rem 0.8rem',
                              width: '120px',
                              opacity: isCurrentAccountLocked() ? 0.5 : 1
                            }}
                          >
                            {timePeriodOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label} ({rewardsRate}%)
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant={isCurrentAccountLocked() ? "secondary" : "outline-primary"}
                            size="sm"
                            style={{
                              borderColor: '#00FFFF',
                              color: isCurrentAccountLocked() ? '#666' : '#00FFFF',
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem',
                              borderRadius: '10px',
                              transition: 'all 0.3s ease',
                              background: isCurrentAccountLocked() ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 255, 255, 0.03)',
                              '&:hover': {
                                background: isCurrentAccountLocked() ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 255, 255, 0.1)',
                                borderColor: '#00FFFF'
                              }
                            }}
                            onClick={handleLock}
                            disabled={isCurrentAccountLocked()}
                          >
                            {isCurrentAccountLocked() ? `Locked (${countdown})` : 'Lock'}
                          </Button>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>T</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>My Rewards</span>
                        </div>
                        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{totalRewards}</span>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            background: 'rgba(0, 255, 255, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00FFFF',
                            fontWeight: 'bold'
                          }}>P</div>
                          <span style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>Liquidity Ratio</span>
                        </div>
                        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '1rem' }}>{userShare}%</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}
          </div>

          {/* Right Side - Main Card */}
          <Card
            border="primary"
        bg="dark"
        key="main-card"
        text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              flex: 1,
              maxWidth: '800px',
              display: 'flex',
              flexDirection: 'column',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)'
              }
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.8rem',
              padding: '0.8rem',
              borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
              background: 'rgba(0, 255, 255, 0.03)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(0, 255, 255, 0.1)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src={Logo} style={{ width: '24px', height: '24px', opacity: 0.8 }}/>
              </div>
              <Card.Title style={{
                fontWeight: "bold", 
                fontSize: "1.4rem",
                color: '#00FFFF',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                margin: 0
              }}>
                DeFi App
          </Card.Title>
            </div>
            
          <Tabs
            defaultActiveKey="swap"
            className="mb-3"
            justify
            style={{
              '--bs-nav-tabs-link-active-color': '#00FFFF',
              '--bs-nav-tabs-link-active-bg': 'rgba(0, 255, 255, 0.05)',
              '--bs-nav-tabs-link-active-border-color': '#00FFFF',
              '--bs-nav-tabs-link-hover-border-color': '#00FFFF',
              '--bs-nav-tabs-link-color': '#E0E0E0',
              padding: '0 2rem',
              borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
              marginTop: '1rem'
            }}
          >
            <Tab eventKey="swap" title="SWAP">
                <Form style={{ padding: "0.8rem", flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    flex: 1
                  }}>
                    <div>
                      <div style={{ 
                        color: '#E0E0E0', 
                        marginBottom: '0.4rem',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>From</div>
                      <div style={{ 
                        display: 'flex',
                        gap: '0.6rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        padding: '0.8rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                      <Form.Control 
                          size="lg"
                          type="number"
                          placeholder="0"
                          value={fromAmount}
                          min="0"
                          onChange={handleFromAmountChange}
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.25rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            '&:hover': {
                              background: 'rgba(28, 28, 28, 0.8)',
                              borderColor: 'rgba(0, 255, 255, 0.5)'
                            },
                            '&:focus': {
                              background: 'rgba(38, 38, 38, 0.8)',
                              borderColor: '#00FFFF',
                              boxShadow: '0 0 0 0.25rem rgba(0, 255, 255, 0.25)'
                            }
                          }}
                        />
                      <Form.Select
                          size="lg"
                          value={fromToken}
                          onChange={(e) => {
                              setFromToken(e.target.value);
                              if (e.target.value === toToken) {
                                  setToToken(fromToken);
                              }
                              setFromAmount('');
                              setToAmount('');
                          }}
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.25rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            '&:hover': {
                              background: 'rgba(28, 28, 28, 0.8)',
                              borderColor: 'rgba(0, 255, 255, 0.5)'
                            },
                            '&:focus': {
                              background: 'rgba(38, 38, 38, 0.8)',
                              borderColor: '#00FFFF',
                              boxShadow: '0 0 0 0.25rem rgba(0, 255, 255, 0.25)'
                            }
                          }}
                      >
                          <option value="ALPHA">ALPHA</option>
                          <option value="BETA">BETA</option>
                      </Form.Select>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center',
                      padding: '0.4rem'
                    }}>
                      <div 
                        style={{
                          padding: '0.8rem',
                          cursor: 'pointer',
                          background: 'rgba(0, 255, 255, 0.05)',
                          borderRadius: '50%',
                          transition: 'all 0.3s ease',
                          border: '1px solid rgba(0, 255, 255, 0.1)',
                          '&:hover': {
                            background: 'rgba(0, 255, 255, 0.1)',
                            transform: 'scale(1.1)'
                          }
                        }}
                        onClick={handleTokenSwitch}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#00FFFF" className="bi bi-arrow-down-up" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5m-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5"/>
                </svg>
              </div>
                    </div>

                    <div>
                      <div style={{ 
                        color: '#E0E0E0', 
                        marginBottom: '0.4rem',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>To</div>
                      <div style={{ 
                        display: 'flex',
                        gap: '0.6rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        padding: '0.8rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(0, 255, 255, 0.05)'
                        }
                      }}>
                        <Form.Control 
                          size="lg"
                                      type="number"
                                      placeholder="0"
                                      value={toAmount}
                                      disabled
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.25rem',
                            fontWeight: '500',
                            padding: '0.5rem 1rem',
                            opacity: 0.7
                          }}
                        />
                  <Form.Select
                    size="lg"
                    value={toToken}
                    onChange={(e) => {
                        setToToken(e.target.value);
                        if (e.target.value === fromToken) {
                            setFromToken(toToken);
                        }
                        setFromAmount('');
                        setToAmount('');
                    }}
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.25rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            '&:hover': {
                              background: 'rgba(28, 28, 28, 0.8)',
                              borderColor: 'rgba(0, 255, 255, 0.5)'
                            },
                            '&:focus': {
                              background: 'rgba(38, 38, 38, 0.8)',
                              borderColor: '#00FFFF',
                              boxShadow: '0 0 0 0.25rem rgba(0, 255, 255, 0.25)'
                            }
                    }}
                    >
                      <option value="ALPHA">ALPHA</option>
                      <option value="BETA">BETA</option>
                    </Form.Select>
                      </div>
                    </div>
                  </div>

                {!isWalletConnected ? (
                    <Button 
                      variant="outline-primary" 
                      size="lg" 
                      style={{
                        marginTop: "0.8rem",
                        borderColor: '#00FFFF',
                        color: '#00FFFF',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        borderRadius: '10px',
                        width: '100%',
                      }} 
                      onClick={handleConnectWallet}
                    >
                    Connect Wallet
                  </Button>
                ) : (
                    <Button 
                      onClick={handleSwap}
                      style={{
                        marginTop: "0.8rem",
                        background: 'linear-gradient(90deg, #00FFFF 0%, #00BFFF 100%)',
                        border: 'none',
                        color: '#000',
                        fontWeight: '600',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        width: '100%',
                      }} 
                    >
                    Swap
                  </Button>
                )}
                </Form>
            </Tab>
            <Tab eventKey="liquidity" title="LIQUIDITY">
                <Form style={{ padding: "0.4rem", flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.4rem',
                    flex: 1
                  }}>
                    <div style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>Add Liquidity</div>
                    <div>
                      <div style={{ 
                        display: 'flex',
                        gap: '0.4rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                      }}>
                          <Form.Control 
                              size="lg"
                              type="number"
                              placeholder="0"
                              value={token0Amount}
                              onChange={handleToken0AmountChange}
                              min="0"
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            padding: '0.4rem 0.8rem',
                          }}
                        />
                        <Form.Select 
                          size="lg" 
                          disabled
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            padding: '0.4rem 0.8rem',
                            opacity: 0.7
                          }}
                        >
                              <option value="ALPHA">ALPHA</option>
                          </Form.Select>
                  </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center',
                      padding: '0.2rem'
                    }}>
                      <div style={{ 
                        padding: '0.4rem',
                        color: '#00FFFF',
                        fontSize: '1.2rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '50%',
                        border: '1px solid rgba(0, 255, 255, 0.1)'
                      }}>
                        +
                      </div>
                  </div>

                    <div>
                      <div style={{ 
                        display: 'flex',
                        gap: '0.4rem',
                        background: 'rgba(0, 255, 255, 0.03)',
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 255, 0.1)',
                      }}>
                          <Form.Control 
                              size="lg"
                              type="number"
                              placeholder="0"
                              value={token1Amount}
                              disabled
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            padding: '0.4rem 0.8rem',
                            opacity: 0.7
                          }}
                        />
                        <Form.Select 
                          size="lg" 
                          disabled
                          style={{
                            background: 'rgba(18, 18, 18, 0.8)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            color: '#00FFFF',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            padding: '0.4rem 0.8rem',
                            opacity: 0.7
                          }}
                        >
                              <option value="BETA">BETA</option>
                          </Form.Select>
                      </div>
                    </div>
                  </div>

                  {!isWalletConnected ? (
                    <Button 
                      variant="outline-primary" 
                      size="lg" 
                      style={{
                        marginTop: "0.6rem",
                        borderColor: '#00FFFF',
                        color: '#00FFFF',
                        padding: '0.4rem',
                        fontSize: '0.9rem',
                        borderRadius: '10px',
                        width: '100%',
                      }} 
                      onClick={handleConnectWallet}
                    >
                          Connect Wallet
                      </Button>
                  ) : (
                    <Button 
                      onClick={handleAddLiquidity}
                      disabled={isCurrentAccountLocked()}
                      style={{
                        marginTop: "0.6rem",
                        background: isCurrentAccountLocked() 
                          ? 'rgba(0, 255, 255, 0.1)' 
                          : 'linear-gradient(90deg, #00FFFF 0%, #00BFFF 100%)',
                        border: 'none',
                        color: isCurrentAccountLocked() ? '#666' : '#000',
                        fontWeight: '600',
                        padding: '0.4rem',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        width: '100%',
                        opacity: isCurrentAccountLocked() ? 0.5 : 1
                      }} 
                    >
                          {isCurrentAccountLocked() ? `Locked (${countdown})` : 'Add Liquidity'}
                      </Button>
                  )}

                  {/* Remove Liquidity Section */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.4rem',
                    padding: '0.6rem',
                    background: 'rgba(0, 255, 255, 0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    marginTop: '0.6rem',
                    opacity: isCurrentAccountLocked() ? 0.5 : 1
                  }}>
                    <div style={{ color: '#E0E0E0', fontSize: '0.9rem' }}>
                      {isCurrentAccountLocked() ? `Remove Liquidity (Locked - ${countdown})` : 'Remove Liquidity'}
                    </div>
                    <div style={{ 
                      display: 'flex',
                      gap: '0.4rem',
                      background: 'rgba(0, 255, 255, 0.03)',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(0, 255, 255, 0.1)',
                    }}>
                      <Form.Control
                        type="number"
                        placeholder="Amount of LP tokens to remove"
                        value={lpAmountToRemove}
                        onChange={(e) => setLpAmountToRemove(e.target.value)}
                        disabled={isCurrentAccountLocked()}
                        style={{
                          background: 'rgba(18, 18, 18, 0.8)',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          color: '#00FFFF',
                          fontSize: '1.1rem',
                          fontWeight: '500',
                          padding: '0.4rem 0.8rem',
                          flex: 1,
                          opacity: isCurrentAccountLocked() ? 0.5 : 1
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(18, 18, 18, 0.8)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        color: '#00FFFF',
                        fontSize: '1.1rem',
                        fontWeight: '500',
                        borderRadius: '4px',
                        opacity: isCurrentAccountLocked() ? 0.5 : 0.7,
                        width: '80px',
                        justifyContent: 'center'
                      }}>
                        LPT
                      </div>
                    </div>
                    <Button 
                      onClick={handleRemoveLiquidity}
                      disabled={isCurrentAccountLocked()}
                      style={{
                        background: isCurrentAccountLocked() 
                          ? 'rgba(0, 255, 255, 0.1)' 
                          : 'linear-gradient(90deg, #00FFFF 0%, #00BFFF 100%)',
                        border: 'none',
                        color: isCurrentAccountLocked() ? '#666' : '#000',
                        fontWeight: '600',
                        padding: '0.4rem',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                      }}
                    >
                      {isCurrentAccountLocked() ? `Locked (${countdown})` : 'Remove Liquidity'}
                    </Button>
                  </div>
              </Form>
            </Tab>
            <Tab eventKey="history" title="HISTORY">
              <div style={{ padding: "1rem" }}>
                <Table striped bordered hover variant="dark" style={{ 
                  background: 'rgba(18, 18, 18, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 255, 255, 0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr>
                      <th style={{ color: '#00FFFF' }}>Type</th>
                      <th style={{ color: '#00FFFF' }}>Amount</th>
                      <th style={{ color: '#00FFFF' }}>Token</th>
                      <th style={{ color: '#00FFFF' }}>Info</th>
                      <th style={{ color: '#00FFFF' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map((transaction) => (
                      <tr key={transaction.id}>
                        <td style={{ color: '#E0E0E0' }}>{transaction.type}</td>
                        <td style={{ color: '#E0E0E0' }}>{transaction.amount}</td>
                        <td style={{ color: '#E0E0E0' }}>{transaction.token}</td>
                        <td style={{ color: '#E0E0E0' }}>{transaction.additionalInfo}</td>
                        <td style={{ color: '#E0E0E0' }}>{transaction.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Tab>
          </Tabs>
	    </Card>
        </div>
      </header>

      {/* Add new visualization cards */}
      {isWalletConnected && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1200px',
          marginTop: '1rem',
          gap: '1rem'
        }}>
          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '30%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Pool Statistics
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Bar
                  data={poolChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '30%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Reward Rates
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Line
                  data={rewardChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '30%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Your Position
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Pie
                  data={userPositionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Add new analysis cards */}
      {isWalletConnected && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1200px',
          marginTop: '1rem',
          gap: '1rem'
        }}>
          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '23%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Transaction Volume
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Bar
                  data={volumeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '23%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Liquidity Trend
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Line
                  data={liquidityTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '23%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                Reward Prediction
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Line
                  data={rewardPredictionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: '#00FFFF'
                        },
                        grid: {
                          color: 'rgba(0, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

          <Card
            border="primary"
            bg="dark"
            text="white"
            style={{ 
              background: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '23%'
            }}
          >
            <Card.Body>
              <Card.Title style={{ color: '#00FFFF', marginBottom: '1rem' }}>
                User Behavior
              </Card.Title>
              <div style={{ height: '200px' }}>
                <Doughnut
                  data={userBehaviorData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#00FFFF'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}

export default App;