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

    // use a memoized function to get the floor price and sales
    nftPromises.push(
      (async () => {
        const fp = await getFloorPrice(nft.contract.address);
        const hasSales = await getSales(nft.contract.address, blockNumber);
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

    if (nftPromises.length >= 85) {
      await Promise.all(nftPromises);
      nftPromises.length = 0;
      fpMap.clear();
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

// create a memoized function to get the floor price
const getFloorPrice = (() => {
  // create a cache object
  const cache = {};
  // return a function that takes a contract address as an argument
  return async (contractAddress) => {
    // check if the cache has the contract address as a key
    if (cache[contractAddress]) {
      // return the cached value
      return cache[contractAddress];
    } else {
      // call the alchemy API to get the floor price
      const floor = await alchemy.nft.getFloorPrice(contractAddress);
      // store the floor price in the cache
      cache[contractAddress] = floor.openSea.floorPrice;
      // return the floor price
      return cache[contractAddress];
    }
  };
})();

// create a memoized function to get the sales
const getSales = (() => {
  // create a cache object
  const cache = {};
  // return a function that takes a contract address and a block number as arguments
  return async (contractAddress, blockNumber) => {
    // create a query string from the contract address and the block number
    const query = `${contractAddress}-${blockNumber}`;
    // check if the cache has the query as a key
    if (cache[query]) {
      // return the cached value
      return cache[query];
    } else {
      // call the alchemy API to get the sales
      const queryParams = {
        contractAddress: contractAddress,
        fromBlock: blockNumber,
        limit: 1,
      };
      const sales = await alchemy.nft.getNftSales(queryParams);
      // store the boolean value of whether there are sales in the cache
      cache[query] = Object.keys(sales.nftSales).length > 0;
      // return the boolean value
      return cache[query];
    }
  };
})();

getNftsPercentage();
