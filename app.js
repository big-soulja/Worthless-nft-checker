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
let cleared = 0;

const getNftsPercentage = async () => {
  let startTime = new Date();
  const nftsForOwner = await alchemy.nft.getNftsForOwner(ownerAddr);
  const totalNftCount = nftsForOwner.totalCount;
  console.log("number of NFTs found:", totalNftCount);
  console.log("...");

  const blockNumber = (await alchemy.core.getBlockNumber()) - 219000;
  console.log(blockNumber);

  var totalFp = 0;
  const nftPromises = [];

  for await (const nft of alchemy.nft.getNftsForOwnerIterator(ownerAddr)) {
    nftPromises.push(
      (async () => {
        const queryParams = {
          contractAddress: nft.contract.address,
          fromBlock: blockNumber,
          limit: 1,
        };
        var floor = await alchemy.nft.getFloorPrice(nft.contract.address);
        var fp = floor.openSea.floorPrice;
        var sales = await alchemy.nft.getNftSales(queryParams);
        //console.log(Object.keys(sales).length);

        if (
          fp !== undefined &&
          fp > 0.01 &&
          Object.keys(sales.nftSales).length > 0
        ) {
          console.log("==");
          console.log(fp);
          totalFp += fp;
          console.log(totalFp);
          console.log("not worthless");
          notWorthlessNft = notWorthlessNft + 1;
        }
      })()
    );
    if (nftPromises.length >= 70) {
      await Promise.all(nftPromises);
      nftPromises.length = 0; // Clear the array
      cleared += 70;
      console.log(cleared);
      // await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
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
  let endTime = new Date();
  let elapsedTime = endTime - startTime;
  console.log(`The program ran for ${elapsedTime} milliseconds.`);
};

getNftsPercentage();

// clean up promise all and fix readability
