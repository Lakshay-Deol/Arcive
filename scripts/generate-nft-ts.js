const fs = require('fs');
const path = require('path');

const artifactPath = path.resolve(__dirname, '../out/ArciveNFT.sol/ArciveNFT.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const outContent = `export const ARCIVE_NFT_ADDRESS = (process.env.NEXT_PUBLIC_ARCIVE_NFT_CONTRACT ||
  process.env.NEXT_PUBLIC_ARCIVE_CONTRACT ||
  "0x5d4821a82df5dEBBc518f9f9FFCcA4fA3c06629F") as \`0x\${string}\`;

export const ARCIVE_NFT_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;

fs.writeFileSync(path.resolve(__dirname, '../lib/arciveNftContract.ts'), outContent);
console.log('lib/arciveNftContract.ts generated successfully!');
