/**
 * Deployment script for ArciveNFT.sol (ERC-721 On-Chain Receipts)
 * Compatible with Arc Mainnet (5042) and Arc Testnet (5042002)
 *
 * Usage:
 * $env:DEPLOYER_PRIVATE_KEY="0x..." ; node scripts/deploy-arcive-nft.js
 *
 * For Mainnet:
 * $env:DEPLOYER_PRIVATE_KEY="0x..." ; $env:CHAIN_ID="5042" ; $env:RPC_URL="https://rpc.mainnet.arc.io" ; $env:EXPLORER_URL="https://explorer.arc.io" ; node scripts/deploy-arcive-nft.js
 */
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: DEPLOYER_PRIVATE_KEY environment variable is required.');
    console.error('Example (PowerShell):');
    console.error('  $env:DEPLOYER_PRIVATE_KEY="0x..." ; node scripts/deploy-arcive-nft.js');
    process.exit(1);
  }

  const chainId = parseInt(process.env.CHAIN_ID || '5042', 10);
  const isMainnet = chainId === 5042;
  const rpcUrl = process.env.RPC_URL || (isMainnet ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.network');
  const explorerUrl = process.env.EXPLORER_URL || (isMainnet ? 'https://explorer.arc.io' : 'https://testnet.arcscan.app');
  const usdcAddress = process.env.USDC_ADDRESS || '0x3600000000000000000000000000000000000000';

  const chain = defineChain({
    id: chainId,
    name: isMainnet ? 'Arc Mainnet' : 'Arc Testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: 'ArcScan', url: explorerUrl } },
  });

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('====================================================');
  console.log('ARCIVE NFT DEPLOYMENT');
  console.log('====================================================');
  console.log('Deployer Address   :', account.address);
  console.log('Network            :', chain.name, `(Chain ID: ${chainId})`);
  console.log('Target RPC         :', rpcUrl);
  console.log('USDC Token Address :', usdcAddress);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Deployer Native Balance:', formatUnits(balance, 18), 'USDC');

  if (balance === 0n) {
    console.warn('\n⚠️ WARNING: Deployer balance is 0. Deployment may revert if funds are needed for gas.');
  }

  const artifactPath = path.resolve(__dirname, '../out/ArciveNFT.sol/ArciveNFT.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('\nError: Artifact not found at', artifactPath);
    console.error('Run: node scripts/compile-arcive-nft.js first.');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\nBroadcasting ArciveNFT deployment transaction...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: `0x${artifact.bytecode.object}`,
    args: [usdcAddress],
  });

  console.log('Transaction Hash:', hash);
  console.log('Waiting for receipt confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log('\n================ DEPLOYMENT SUCCESS ================');
  console.log('Contract Address :', receipt.contractAddress);
  console.log('Block Number     :', receipt.blockNumber.toString());
  console.log('Gas Used         :', receipt.gasUsed.toString());
  console.log('Explorer URL     :', `${explorerUrl}/address/${receipt.contractAddress}`);
  console.log('====================================================');
  console.log('\nNext steps:');
  console.log(`Add to your .env.local / Vercel:`);
  console.log(`NEXT_PUBLIC_ARCIVE_NFT_CONTRACT=${receipt.contractAddress}`);
  console.log(`NEXT_PUBLIC_ARCIVE_CONTRACT=${receipt.contractAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log(`NEXT_PUBLIC_RPC_URL=${rpcUrl}`);
  console.log(`NEXT_PUBLIC_EXPLORER_URL=${explorerUrl}`);
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
