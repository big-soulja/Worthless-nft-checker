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
var notWorthlessNft = 0;

const getNftsPercentage = async () => {
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
        console.log(Object.keys(sales).length);

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
};

getNftsPercentage();

// clean up promise all and fix readability

// Create a limiter that allows, for example, 5 requests per second
// const limiter = new Bottleneck({
//   reservoir: 100, // Maximum number of requests
//   reservoirRefreshAmount: 100, // Number of requests to add back to the reservoir after waiting
//   reservoirRefreshInterval: 2000, // Time interval to add back requests to the reservoir (in ms)
// });

// const getNftsPercentage = async () => {
//   const nftsForOwner = await alchemy.nft.getNftsForOwner(ownerAddr);
//   const totalNftCount = nftsForOwner.totalCount;
//   console.log("number of NFTs found:", totalNftCount);
//   console.log("...");
//   var totalFp = 0;
//   const nftPromises = [];

//   for await (const nft of alchemy.nft.getNftsForOwnerIterator(ownerAddr)) {
//     nftPromises.push(
//       limiter.schedule(async () => {
//         var floor = await alchemy.nft.getFloorPrice(nft.contract.address);
//         var fp = floor.openSea.floorPrice;
//         if (fp !== undefined) {
//           console.log("==");
//           console.log(fp);
//           totalFp += fp;
//           console.log(totalFp);
//           if (fp < 0.01) {
//             console.log("worthless");
//             worthlessNft = worthlessNft + 1;
//           }
//         }
//       })
//     );
//   }

//   await Promise.all(nftPromises);

//   console.log("===");
//   console.log(worthlessNft);
//   const worthlessPercentage = (worthlessNft / totalNftCount) * 100;
//   console.log(
//     "Only " +
//       Math.ceil(worthlessPercentage) +
//       "%" +
//       " of your nfts are worthless"
//   );
//   console.log("Total value = " + totalFp);
// };

// getNftsPercentage();
