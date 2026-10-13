/**
 * Deployment script for ArciveNFT.sol on Arc Mainnet (Chain ID 5042)
 *
 * Usage (PowerShell):
 * $env:DEPLOYER_PRIVATE_KEY="0xYOUR_MAINNET_PRIVATE_KEY" ; node scripts/deploy-arcive-nft.js
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
    console.error('  $env:DEPLOYER_PRIVATE_KEY="0x..." ; npm run deploy:mainnet');
    process.exit(1);
  }

  const chainId = parseInt(process.env.CHAIN_ID || '5042', 10);
  const rpcUrl = process.env.RPC_URL || 'https://rpc.mainnet.arc.io';
  const explorerUrl = process.env.EXPLORER_URL || 'https://explorer.arc.io';
  const usdcAddress = process.env.USDC_ADDRESS || '0x3600000000000000000000000000000000000000';

  const chain = defineChain({
    id: chainId,
    name: 'Arc Mainnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: 'ArcScan', url: explorerUrl } },
  });

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('====================================================');
  console.log('ARCIVE MAINNET DEPLOYMENT (CHAIN ID: 5042)');
  console.log('====================================================');
  console.log('Deployer Address   :', account.address);
  console.log('Network            :', chain.name, `(Chain ID: ${chainId})`);
  console.log('Target RPC         :', rpcUrl);
  console.log('USDC Token Address :', usdcAddress);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Pre-flight balance check
  try {
    const balance = await publicClient.getBalance({ address: account.address });
    console.log('Deployer Native Balance:', formatUnits(balance, 18), 'USDC');

    if (balance === 0n) {
      console.warn('\n⚠️ WARNING: Deployer balance is 0 USDC. Ensure wallet has sufficient gas funds.');
    }
  } catch (balanceErr) {
    console.warn('Notice: Could not fetch balance prior to broadcast (RPC node may require direct transaction submission).', balanceErr.message);
  }

  const artifactPath = path.resolve(__dirname, '../out/ArciveNFT.sol/ArciveNFT.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('\nError: Artifact not found at', artifactPath);
    console.error('Run: npm run compile first.');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\nBroadcasting ArciveNFT deployment transaction to Arc Mainnet...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: `0x${artifact.bytecode.object}`,
    args: [usdcAddress],
  });

  console.log('Transaction Hash:', hash);
  console.log('Waiting for confirmation on Arc Mainnet...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log('\n================ DEPLOYMENT SUCCESS ================');
  console.log('Contract Address :', receipt.contractAddress);
  console.log('Block Number     :', receipt.blockNumber.toString());
  console.log('Gas Used         :', receipt.gasUsed.toString());
  console.log('Explorer URL     :', `${explorerUrl}/address/${receipt.contractAddress}`);
  console.log('====================================================');

  // Automatically update .env.local with deployed contract address if file exists
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    let envContent = fs.readFileSync(envLocalPath, 'utf8');
    envContent = envContent.replace(/NEXT_PUBLIC_ARCIVE_NFT_CONTRACT=.*/g, `NEXT_PUBLIC_ARCIVE_NFT_CONTRACT=${receipt.contractAddress}`);
    envContent = envContent.replace(/NEXT_PUBLIC_ARCIVE_CONTRACT=.*/g, `NEXT_PUBLIC_ARCIVE_CONTRACT=${receipt.contractAddress}`);
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✓ Updated .env.local with deployed contract address.');
  }

  console.log('\nNext steps:');
  console.log('1. Add to Vercel Environment Variables:');
  console.log(`   NEXT_PUBLIC_CHAIN_ID=5042`);
  console.log(`   NEXT_PUBLIC_RPC_URL=${rpcUrl}`);
  console.log(`   NEXT_PUBLIC_ARCIVE_NFT_CONTRACT=${receipt.contractAddress}`);
  console.log(`   NEXT_PUBLIC_ARCIVE_CONTRACT=${receipt.contractAddress}`);
  console.log(`   NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
  console.log(`   NEXT_PUBLIC_EXPLORER_URL=${explorerUrl}`);
  console.log('2. Redeploy or restart dev server: npm run dev');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
