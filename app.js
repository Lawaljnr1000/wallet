// ———————————————————————————————————————————————
// 1. Create & Encrypt a New Wallet
// ———————————————————————————————————————————————
document.getElementById('createWalletBtn').onclick = async () => {
  const wallet = ethers.Wallet.createRandom();                        // createRandom :contentReference[oaicite:10]{index=10}
  const password = prompt('Set a password to encrypt your wallet:');
  const encryptedJson = await wallet.encrypt(password);                // wallet.encrypt :contentReference[oaicite:11]{index=11}
  localStorage.setItem('encryptedWallet', encryptedJson);              // Store encrypted JSON
  document.getElementById('newWalletInfo').innerHTML = `
    <p>Address: ${wallet.address}</p>
    <p>Encrypted JSON saved to localStorage.</p>
  `;
};

// ———————————————————————————————————————————————
// 2. Connect Existing Wallet via Web3Modal
// ———————————————————————————————————————————————
let provider, signer;
const web3Modal = new Web3Modal.default({
  cacheProvider: false,
  providerOptions: {
    walletconnect: {
      package: window.WalletConnectProvider.default,
      options: { infuraId: 'YOUR_INFURA_ID' }
    }
  }
});                                                                  // Web3Modal init :contentReference[oaicite:12]{index=12}

document.getElementById('connectWalletBtn').onclick = async () => {
  const instance = await web3Modal.connect();
  provider = new ethers.providers.Web3Provider(instance);
  signer = provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  document.getElementById('connectedInfo').innerHTML = `
    <p>Connected: ${address}</p>
    <p>Balance: ${ethers.utils.formatEther(balance)} ETH</p>
  `;

  // Show Receive UI
  document.getElementById('receiveSection').style.display = 'block';
  document.getElementById('recvAddress').innerText = address;
  new QRCode(document.getElementById('recvQr'), address);            // QRCode :contentReference[oaicite:13]{index=13}

  fetchHistory();
  showTokenBalances();
};

// ———————————————————————————————————————————————
// 3. Send ETH
// ———————————————————————————————————————————————
document.getElementById('sendBtn').onclick = async () => {
  const to = document.getElementById('sendTo').value;
  const amount = document.getElementById('sendAmount').value;
  document.getElementById('sendStatus').innerText = 'Sending…';
  try {
    const tx = await signer.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount)
    });                                                              // sendTransaction :contentReference[oaicite:14]{index=14}
    await tx.wait();
    document.getElementById('sendStatus').innerText = `Sent! TX: ${tx.hash}`;
  } catch (err) {
    document.getElementById('sendStatus').innerText = `Error: ${err.message}`;
  }
};

// ———————————————————————————————————————————————
// 4. Swap ETH → DAI via Uniswap V3
// ———————————————————————————————————————————————
document.getElementById('swapBtn').onclick = async () => {
  const amountIn = document.getElementById('swapAmount').value;
  document.getElementById('swapStatus').innerText = 'Preparing swap…';
  const chainId = 1;
  const WETH = window.UniswapSDK.WETH[chainId];
  const DAI = await window.UniswapSDK.Fetcher.fetchTokenData(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F');
  const pair = await window.UniswapSDK.Fetcher.fetchPairData(DAI, WETH);
  const route = new window.UniswapSDK.Route([pair], WETH);
  const trade = new window.UniswapSDK.Trade(
    route,
    new window.UniswapSDK.TokenAmount(WETH, ethers.utils.parseEther(amountIn).toString()),
    window.UniswapSDK.TradeType.EXACT_INPUT
  );                                                                // Uniswap trade :contentReference[oaicite:15]{index=15}

  const slippageTolerance = new window.UniswapSDK.Percent('50', '10000'); // 0.5%
  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
  const path = [WETH.address, DAI.address];
  const toAddress = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const uniswapRouter = new ethers.Contract(
    window.UniswapSDK.Router.address,
    window.UniswapSDK.Router.abi,
    signer
  );
  try {
    const tx = await uniswapRouter.swapExactETHForTokens(
      amountOutMin,
      path,
      toAddress,
      deadline,
      { value: ethers.utils.parseEther(amountIn) }
    );
    await tx.wait();
    document.getElementById('swapStatus').innerText = `Swap complete! TX: ${tx.hash}`;
  } catch (err) {
    document.getElementById('swapStatus').innerText = `Swap error: ${err.message}`;
  }
};

// ———————————————————————————————————————————————
// 5. Fetch & Display Transaction History
// ———————————————————————————————————————————————
async function fetchHistory() {
  const addr = await signer.getAddress();
  const resp = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${addr}&sort=desc&apikey=YOUR_ETHERSCAN_KEY`);
  const { result } = await resp.json();
  const list = result.slice(0, 5).map(tx =>
    `<li>${ethers.utils.formatEther(tx.value)} ETH → ${tx.to} (<a href="https://etherscan.io/tx/${tx.hash}" target="_blank">View</a>)</li>`
  ).join('');
  document.getElementById('historyList').innerHTML = `<ul>${list}</ul>`;
}

// ———————————————————————————————————————————————
// 6. Show ERC‑20 Token Balances & Approvals
// ———————————————————————————————————————————————
const tokenContracts = {
  DAI:  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  USDC: { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6  }
};

async function showTokenBalances() {
  const addr = await signer.getAddress();
  let html = '';
  for (const [sym, { address, decimals }] of Object.entries(tokenContracts)) {
    const token = new ethers.Contract(address, ['function balanceOf(address) view returns (uint256)'], provider);
    const raw = await token.balanceOf(addr);
    html += `<p>${sym}: ${ethers.utils.formatUnits(raw, decimals)}</p>`;
  }
  document.getElementById('tokenBalances').innerHTML = html;
}
