/**
 * scripts/estimate-gas.js
 *
 * Safe, read-only gas estimator for Arc Mainnet (Chain ID 5042).
 * Simulates contract deployment on Arc Mainnet, calculates fees using integer
 * arithmetic, and provides exact funding recommendations with safety buffers.
 *
 * ZERO-SECRET & READ-ONLY:
 * - NEVER submits transactions or broadcasts deployments.
 * - NEVER logs or requires private keys (accepts optional public address).
 *
 * Usage:
 *   node scripts/estimate-gas.js
 *   node scripts/estimate-gas.js 0xYOUR_WALLET_ADDRESS
 *   npm run estimate-gas
 */

const fs = require('fs');
const path = require('path');
const {
  createPublicClient,
  http,
  defineChain,
  encodeDeployData,
  formatUnits,
  isAddress,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://rpc.mainnet.arc.io';
  const expectedChainId = parseInt(process.env.CHAIN_ID || '5042', 10);
  const usdcAddress = process.env.USDC_ADDRESS || '0x3600000000000000000000000000000000000000';

  console.log('\n===============================================================');
  console.log('       ARC MAINNET DEPLOYMENT GAS & FUNDING ESTIMATOR           ');
  console.log('===============================================================\n');

  // 1. Initialize viem client for Arc Mainnet
  const arcMainnet = defineChain({
    id: expectedChainId,
    name: 'Arc Mainnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: 'ArcScan', url: 'https://explorer.arc.io' } },
  });

  const publicClient = createPublicClient({
    chain: arcMainnet,
    transport: http(rpcUrl),
  });

  // 2. Validate RPC Connectivity & Verify Chain ID (Must be 5042)
  process.stdout.write('1. Connecting to Arc RPC and verifying Chain ID... ');
  let actualChainId;
  try {
    actualChainId = await publicClient.getChainId();
  } catch (rpcErr) {
    console.error('\n\n❌ RPC Connection Failure:');
    console.error(`   Unable to reach RPC endpoint at: ${rpcUrl}`);
    console.error(`   Details: ${rpcErr.message}`);
    console.error('\nCheck your internet connection or verify the endpoint at https://status.arc.io');
    process.exit(1);
  }

  if (actualChainId !== expectedChainId) {
    console.error('\n\n❌ Chain ID Verification Mismatch:');
    console.error(`   Expected Arc Mainnet Chain ID: ${expectedChainId}`);
    console.error(`   RPC Reported Chain ID         : ${actualChainId}`);
    console.error('   Aborting to prevent accidental deployment on unintended network.');
    process.exit(1);
  }
  console.log(`✓ OK (Chain ID: ${actualChainId})`);

  // 3. Determine Wallet Address (Optional for balance check, no private key needed)
  let walletAddress = null;
  const argAddr = process.argv.slice(2).find((a) => isAddress(a));
  if (argAddr) {
    walletAddress = argAddr;
  } else if (process.env.DEPLOYER_ADDRESS && isAddress(process.env.DEPLOYER_ADDRESS)) {
    walletAddress = process.env.DEPLOYER_ADDRESS;
  } else if (process.env.DEPLOYER_PRIVATE_KEY) {
    try {
      const pk = process.env.DEPLOYER_PRIVATE_KEY.startsWith('0x')
        ? process.env.DEPLOYER_PRIVATE_KEY
        : `0x${process.env.DEPLOYER_PRIVATE_KEY}`;
      walletAddress = privateKeyToAccount(pk).address;
    } catch {
      // Ignore private key parse errors during estimation
    }
  }

  // 4. Query Deployer Native USDC Balance (if address provided)
  let currentBalance = null;
  if (walletAddress) {
    try {
      currentBalance = await publicClient.getBalance({ address: walletAddress });
    } catch (balErr) {
      console.warn(`\n⚠️ Could not query balance for ${walletAddress}: ${balErr.message}`);
    }
  }

  // 5. Load Compiled Contract Artifact
  process.stdout.write('2. Loading compiled contract artifact (out/ArciveNFT.sol/ArciveNFT.json)... ');
  const artifactPath = path.resolve(__dirname, '../out/ArciveNFT.sol/ArciveNFT.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('\n\n❌ Artifact Not Found:');
    console.error(`   Path: ${artifactPath}`);
    console.error('   Please run: npm run compile');
    process.exit(1);
  }

  let artifact;
  try {
    artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    if (!artifact.abi || !artifact.bytecode || !artifact.bytecode.object) {
      throw new Error('Invalid artifact structure: missing abi or bytecode.object');
    }
  } catch (parseErr) {
    console.error('\n\n❌ Failed to parse artifact:', parseErr.message);
    console.error('   Please recompile with: npm run compile');
    process.exit(1);
  }
  console.log(`✓ OK (Bytecode size: ${artifact.bytecode.object.length / 2} bytes)`);

  // 6. Encode Constructor Arguments & Bytecode
  // ArciveNFT.sol constructor takes: constructor(address usdcAddress)
  process.stdout.write('3. Encoding constructor arguments for ArciveNFT... ');
  let deployData;
  try {
    deployData = encodeDeployData({
      abi: artifact.abi,
      bytecode: `0x${artifact.bytecode.object}`,
      args: [usdcAddress],
    });
  } catch (encErr) {
    console.error('\n\n❌ ABI Encoding Error:');
    console.error(`   Constructor expects: address usdcAddress`);
    console.error(`   Provided: ${usdcAddress}`);
    console.error(`   Details: ${encErr.message}`);
    process.exit(1);
  }
  console.log(`✓ OK (USDC Address: ${usdcAddress})`);

  // 7. Query Current Gas Price from Mainnet
  process.stdout.write('4. Fetching current Arc Mainnet gas price... ');
  let gasPrice;
  try {
    gasPrice = await publicClient.getGasPrice();
  } catch (gpErr) {
    console.error('\n\n❌ Failed to fetch gas price from Arc RPC:', gpErr.message);
    process.exit(1);
  }
  const gasPriceGwei = (Number(gasPrice) / 1e9).toFixed(4);
  console.log(`✓ OK (${gasPrice.toString()} wei / ${gasPriceGwei} Gwei)`);

  // 8. Estimate Deployment Gas on Arc Mainnet
  process.stdout.write('5. Simulating deployment transaction on Arc Mainnet... ');
  let estimatedGas;
  try {
    const estimationAccount = walletAddress || '0x0000000000000000000000000000000000000001';
    estimatedGas = await publicClient.estimateGas({
      data: deployData,
      account: estimationAccount,
    });
  } catch (estErr) {
    console.error('\n\n❌ Gas Estimation Failed:');
    console.error(`   Details: ${estErr.message}`);
    console.error('   The RPC may not support state override simulation or rejected the bytecode.');
    process.exit(1);
  }
  console.log(`✓ OK (${estimatedGas.toString()} gas units)`);

  // 9. Integer Arithmetic Calculations for Exact Fees (18 decimals native gas)
  const estimatedFee = estimatedGas * gasPrice;
  const buffer20 = (estimatedFee * 120n) / 100n;
  const buffer50 = (estimatedFee * 150n) / 100n;
  const buffer100 = estimatedFee * 2n;

  // Formatting in Native USDC (18 decimals)
  const feeUsdc = formatUnits(estimatedFee, 18);
  const buffer20Usdc = formatUnits(buffer20, 18);
  const buffer50Usdc = formatUnits(buffer50, 18);
  const buffer100Usdc = formatUnits(buffer100, 18);

  // 10. Display Summary Report
  console.log('\n===============================================================');
  console.log('                    ESTIMATION REPORT                          ');
  console.log('===============================================================');
  console.log(`Target Contract     : ArciveNFT (ERC-721 + On-Chain SVG)`);
  console.log(`Network             : Arc Mainnet`);
  console.log(`RPC Endpoint        : ${rpcUrl}`);
  console.log(`Verified Chain ID   : ${actualChainId}`);
  console.log(`Deployer Account    : ${walletAddress ? walletAddress : '(No wallet passed, used simulation address)'}`);
  if (currentBalance !== null) {
    console.log(`Current Balance     : ${formatUnits(currentBalance, 18)} USDC`);
  }
  console.log(`Gas Units Required  : ${estimatedGas.toLocaleString()} gas`);
  console.log(`Current Gas Price   : ${gasPriceGwei} Gwei (${gasPrice.toString()} wei)`);
  console.log(`Estimated Base Fee  : ${feeUsdc} USDC`);
  console.log('---------------------------------------------------------------');
  console.log('RECOMMENDED FUNDING TARGETS (With Safety Buffers):');
  console.log(`  • +20% Buffer     : ${buffer20Usdc} USDC`);
  console.log(`  • +50% Buffer     : ${buffer50Usdc} USDC (Recommended for safe execution)`);
  console.log(`  • +100% (2x) Buffer: ${buffer100Usdc} USDC (Extra conservative)`);
  console.log('===============================================================\n');

  // 11. Practical Onramp / Funding Guidance
  console.log('💡 ONRAMP / UPI BUYING GUIDANCE:');
  console.log('---------------------------------------------------------------');
  console.log('Arc uses USDC as its native gas token with 18 decimal places.');
  console.log(`The estimated deployment cost is only ~${feeUsdc.slice(0, 8)} USDC.`);
  console.log('Most onramp platforms (such as Onramp.money via UPI) have a minimum');
  console.log('purchase threshold (typically ~₹100 to ₹500, or approx $1 to $5 USDC).');
  console.log('');
  console.log(`👉 Recommended Action:`);
  console.log(`   Purchasing even 1 USDC (or the platform minimum) will provide`);
  console.log(`   more than 15x-20x the total gas needed for deployment + multiple`);
  console.log(`   test transactions on Arc Mainnet.`);
  console.log('---------------------------------------------------------------\n');

  if (currentBalance !== null) {
    if (currentBalance >= buffer50) {
      console.log('✅ STATUS: Wallet has SUFFICIENT balance to deploy safely right now!');
    } else {
      const deficit = buffer50 - currentBalance;
      console.log(`⚠️ STATUS: Wallet balance is below the recommended 50% buffer.`);
      console.log(`   Need at least +${formatUnits(deficit, 18)} USDC before deploying.\n`);
    }
  }
}

main().catch((err) => {
  console.error('\nFatal Error:', err);
  process.exit(1);
});
