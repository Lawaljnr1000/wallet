// Ensure the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const createWalletBtn = document.getElementById('createWalletBtn');
  const connectWalletBtn = document.getElementById('connectWalletBtn');
  const sendBtn = document.getElementById('sendBtn');
  const swapBtn = document.getElementById('swapBtn');
  const reloadBtn = document.getElementById('reloadBtn');

  const newWalletInfo = document.getElementById('newWalletInfo');
  const walletAddress = document.getElementById('walletAddress');
  const sendStatus = document.getElementById('sendStatus');
  const swapStatus = document.getElementById('swapStatus');

  let provider;
  let signer;

  // Create a new wallet
  createWalletBtn.addEventListener('click', async () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      newWalletInfo.innerText = `Address: ${wallet.address}\nPrivate Key: ${wallet.privateKey}`;
    } catch (error) {
      console.error(error);
      newWalletInfo.innerText = 'Error creating wallet.';
    }
  });

  // Connect to MetaMask wallet
  connectWalletBtn.addEventListener('click', async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask is not installed!');
        return;
      }
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      const address = await signer.getAddress();
      walletAddress.innerText = `Connected: ${address}`;
    } catch (error) {
      console.error(error);
      walletAddress.innerText = 'Error connecting wallet.';
    }
  });

  // Send ETH to another address
  sendBtn.addEventListener('click', async () => {
    try {
      if (!signer) {
        alert('Please connect your wallet first.');
        return;
      }
      const to = document.getElementById('sendTo').value;
      const amount = document.getElementById('sendAmount').value;
      if (!ethers.utils.isAddress(to)) {
        alert('Invalid recipient address.');
        return;
      }
      const tx = await signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount)
      });
      sendStatus.innerText = `Transaction sent: ${tx.hash}`;
      await tx.wait();
      sendStatus.innerText = `Transaction confirmed: ${tx.hash}`;
    } catch (error) {
      console.error(error);
      sendStatus.innerText = 'Error sending transaction.';
    }
  });

  // Swap ETH to DAI using Uniswap V2
  swapBtn.addEventListener('click', async () => {
    try {
      if (!signer) {
        alert('Please connect your wallet first.');
        return;
      }

      const amountIn = document.getElementById('swapAmount').value;
      const amountInWei = ethers.utils.parseEther(amountIn);

      // Uniswap V2 Router address
      const uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

      // DAI token address
      const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

      // WETH token address
      const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

      const uniswapRouterAbi = [
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'
      ];

      const router = new ethers.Contract(uniswapRouterAddress, uniswapRouterAbi, signer);

      const path = [wethAddress, daiAddress];
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time

      const tx = await router.swapExactETHForTokens(
        0, // amountOutMin: accept any amount of DAI
        path,
        to,
        deadline,
        { value: amountInWei }
      );

      swapStatus.innerText = `Swap transaction sent: ${tx.hash}`;
      await tx.wait();
      swapStatus.innerText = `Swap transaction confirmed: ${tx.hash}`;
    } catch (error) {
      console.error(error);
      swapStatus.innerText = 'Error swapping tokens.';
    }
  });

  // Reload the page
  reloadBtn.addEventListener('click', () => {
    location.reload();
  });
});
