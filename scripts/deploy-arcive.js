/**
 * Deploy script using viem / native RPC
 * Run by the user in their own terminal:
 * node scripts/deploy-arcive.js
 *
 * It reads DEPLOYER_PRIVATE_KEY from shell env (never logged or saved).
 */
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { defineChain } = require('viem');

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: Please set DEPLOYER_PRIVATE_KEY in your shell environment.');
    console.error('Example (PowerShell): $env:DEPLOYER_PRIVATE_KEY="0x..." ; node scripts/deploy-arcive.js');
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || 'https://rpc.mainnet.arc.io';
  const chainId = parseInt(process.env.CHAIN_ID || '5042', 10);
  const usdcAddress = process.env.USDC_ADDRESS || '0x3600000000000000000000000000000000000000';

  const chain = defineChain({
    id: chainId,
    name: 'Arc Mainnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('Deployer Address:', account.address);
  console.log('Target RPC:', rpcUrl, '(Chain ID:', chainId, ')');
  console.log('USDC Constructor Argument:', usdcAddress);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const artifactPath = path.resolve(__dirname, '../out/Arcive.sol/Arcive.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\nBroadcasting deployment transaction...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: `0x${artifact.bytecode.object}`,
    args: [usdcAddress],
  });

  console.log('Transaction hash:', hash);
  console.log('Waiting for receipt...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log('\n================ DEPLOYMENT SUCCESS ================');
  console.log('Contract Address:', receipt.contractAddress);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
