const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '../contracts/Arcive.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'Arcive.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasError = true;
  });
  if (hasError) process.exit(1);
}

const contract = output.contracts['Arcive.sol']['Arcive'];
const outDir = path.resolve(__dirname, '../out/Arcive.sol');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'Arcive.json'),
  JSON.stringify(
    {
      abi: contract.abi,
      bytecode: { object: contract.evm.bytecode.object },
    },
    null,
    2
  )
);

console.log('✓ Arcive.sol compiled successfully!');
console.log('Bytecode size:', contract.evm.bytecode.object.length / 2, 'bytes');
console.log('Artifact saved to: out/Arcive.sol/Arcive.json');
