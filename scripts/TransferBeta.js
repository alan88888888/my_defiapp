const { ethers } = require("hardhat");
const addresses = require("../workspace/frontend/src/utils/deployed-addresses.json"); 

async function main() {
  // Connect to the Hardhat network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Replace with the address of the recipient account
  const recipientAddress = "0xB8f184757Be5482E675B35541581e696A094d85c"; // My address (from MetaMask)

  const NewToken = await hre.ethers.getContractFactory("NewToken");
  const Beta = NewToken.attach(addresses.token1)
  
  const amount = ethers.parseEther("500000");
  await Beta.transfer(recipientAddress, amount)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });