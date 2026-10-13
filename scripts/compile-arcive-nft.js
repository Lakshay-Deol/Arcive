const fs = require('fs');
const path = require('path');
const solc = require('solc');

function findImports(importPath) {
  if (importPath.startsWith('@openzeppelin/')) {
    const fullPath = path.resolve(__dirname, '../node_modules', importPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
  }
  const localPath = path.resolve(__dirname, '../contracts', importPath);
  if (fs.existsSync(localPath)) {
    return { contents: fs.readFileSync(localPath, 'utf8') };
  }
  return { error: 'File not found: ' + importPath };
}

const contractPath = path.resolve(__dirname, '../contracts/ArciveNFT.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'ArciveNFT.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
    evmVersion: 'cancun',
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

console.log('Compiling ArciveNFT.sol with OpenZeppelin...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err) => {
    if (err.severity === 'error') {
      console.error(err.formattedMessage);
      hasError = true;
    } else {
      console.warn(err.formattedMessage);
    }
  });
  if (hasError) process.exit(1);
}

const contract = output.contracts['ArciveNFT.sol']['ArciveNFT'];
const outDir = path.resolve(__dirname, '../out/ArciveNFT.sol');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'ArciveNFT.json'),
  JSON.stringify(
    {
      abi: contract.abi,
      bytecode: { object: contract.evm.bytecode.object },
    },
    null,
    2
  )
);

console.log('✓ ArciveNFT.sol compiled successfully!');
console.log('Bytecode size:', contract.evm.bytecode.object.length / 2, 'bytes');
console.log('Artifact saved to: out/ArciveNFT.sol/ArciveNFT.json');
