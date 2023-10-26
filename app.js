const { Network, Alchemy } = require("alchemy-sdk");
require("dotenv").config();

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

const ownerAddr = "bigsoulja.eth";
console.log("fetching NFTs for address:", ownerAddr);
console.log("...");

let notWorthlessNft = 0;
let totalFp = 0;

const getNftsPercentage = async () => {
  const startTime = new Date();
  const nftsForOwner = await alchemy.nft.getNftsForOwner(ownerAddr);
  const totalNftCount = nftsForOwner.totalCount;
  console.log("number of NFTs found:", totalNftCount);
  console.log("...");

  const blockNumber = (await alchemy.core.getBlockNumber()) - 219000;
  console.log(blockNumber);

  const fpMap = new Map();
  const nftPromises = [];

  for await (const nft of alchemy.nft.getNftsForOwnerIterator(ownerAddr)) {
    if (fpMap.has(nft.contract.address)) {
      console.log("Skipping duplicate contract address:", nft.contract.address);
      if (fpMap.get(nft.contract.address) > 0.01) {
        totalFp += fpMap.get(nft.contract.address);
        console.log(totalFp);
        console.log("not worthless");
        notWorthlessNft++;
      }
      continue;
    }

    nftPromises.push(
      (async () => {
        const queryParams = {
          contractAddress: nft.contract.address,
          fromBlock: blockNumber,
          limit: 1,
        };
        const floor = await alchemy.nft.getFloorPrice(nft.contract.address);
        const fp = floor.openSea.floorPrice;
        const sales = await alchemy.nft.getNftSales(queryParams);
        const hasSales = Object.keys(sales.nftSales).length > 0;
        if (fp !== undefined && fp > 0.01 && hasSales) {
          console.log("==");
          console.log(fp);
          totalFp += fp;
          console.log(totalFp);
          console.log("not worthless");
          notWorthlessNft++;
        }
        if (hasSales) {
          fpMap.set(nft.contract.address, fp);
        }
      })()
    );

    if (nftPromises.length >= 70) {
      await Promise.all(nftPromises);
      nftPromises.length = 0;
    }
  }

  await Promise.all(nftPromises);

  console.log("===");
  console.log(notWorthlessNft);
  const worthlessPercentage =
    ((totalNftCount - notWorthlessNft) / totalNftCount) * 100;
  console.log(
    "Only " +
      Math.ceil(worthlessPercentage) +
      "%" +
      " of your nfts are worthless"
  );
  console.log("Total value = " + totalFp);

  const endTime = new Date();
  const elapsedTime = endTime - startTime;
  console.log(`The program ran for ${elapsedTime} milliseconds.`);
};

getNftsPercentage();

// clean up promise all and fix readability
