// Add reward rate calculation based on time period
function calculateRewardRate(uint256 timePeriod) public pure returns (uint256) {
    if (timePeriod == 14 days) {
        return 5; // 5% for 14 days
    } else if (timePeriod == 31 days) {
        return 12; // 12% for 31 days
    } else if (timePeriod == 90 days) {
        return 40; // 40% for 3 months
    } else if (timePeriod == 180 days) {
        return 85; // 85% for 6 months
    } else if (timePeriod == 365 days) {
        return 180; // 180% for 1 year
    }
    return 0; // Default 3% for less than 14 days
}

// Add function to calculate rewards based on time period
function calculateRewards(address user, uint256 timePeriod) public view returns (uint256) {
    uint256 userBalance = balanceOf(user);
    uint256 totalSupply = totalSupply();
    if (totalSupply == 0) return 0;

    uint256 rewardRate = calculateRewardRate(timePeriod);
    uint256 userShare = (userBalance * 100) / totalSupply;
    
    // Calculate rewards based on user's share and reward rate
    uint256 rewards = (userBalance * rewardRate) / 100;
    return rewards;
} 