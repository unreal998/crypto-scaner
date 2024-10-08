import Web3 from "web3";
import axios from "axios";
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from "../constants.js";

const web3 = new Web3(
  "https://mainnet.infura.io/v3/748fe6f1298e4171bf93bff233e9a598"
);

const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

const methodSignatures = {
  "0x3593564c": "EXECUTE - Swap",
};

const contractTypes = {
  // Uniswap V2 Contracts
  "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": "Uniswap V2",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2",
  "0xeedff72a683058f8ff531e8c98575f920430fdc5": "Uniswap V2",
  "0xd744c01ed82c61fa8cd1bfac89c988292ff5e0da": "Uniswap V2",
  "0xf256a4a0031970fd2e65fea80482bd61a0ca6197": "Uniswap V2",
  "0xc0e6eef914d7bb0d4e6f72bc64ed69383fdb06e4": "Uniswap V2",

  "0x1f98431c8ad98523631ae4a59f267346ea31f984": "Uniswap V3",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3",
  "0xc36442b4a4522e871399cd717abdd847ab11fe88": "Uniswap V3",
  "0xe331de28cd81b768c19a366b0e4e4675c45ec2da": "Uniswap V3",
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap Universal V3/V2",

  // SushiSwap Contracts
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": "SushiSwap Router",

  // Metamask
  "0x881d40237659c251811cec9c364ef91dc08d300c": "Metamask",
  "0x74de5d4fcbf63e00296fd95d33236b9794016631": "MetaMask",

  // Uses with Fees!!!!
  // Maestro
  "0x80a64c6d7f12c47b7c66c5b4e20e72bc1fcd5d9e": "Maestro: Router 2",

  // ParaSwap: Augustus V6.2
  "0x6a000f20005980200259b80c5102003040001068": "ParaSwap: Augustus V6.2",
};

function getMethodNameBySignature(signature) {
  return methodSignatures[signature] || "Unknown method signature";
}

function getContractType(contractAddress) {
  return (
    contractTypes[contractAddress.toLowerCase()] || "Unknown contract type"
  );
}

async function getTokenSymbol(tokenAddress) {
  if (
    tokenAddress.toLowerCase() ===
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    tokenAddress.toLowerCase() === "0xc02aaaa39b223fe8d0a0e5c4f27ead9083c756cc" // WETH address
  ) {
    return "ETH"; // Повертаємо ETH замість WETH
  }

  // Додаємо INTX символ вручну
  if (
    tokenAddress.toLowerCase() === "0xeec55f2f009d2a94d6a181bc49c830f649aba94f"
  ) {
    return "INTX";
  }

  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  try {
    const symbol = await tokenContract.methods.symbol().call();
    return symbol === "WETH" ? "ETH" : symbol; // Примусова заміна WETH на ETH
  } catch (error) {
    return "Unknown";
  }
}

async function getTokenDecimals(tokenAddress) {
  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  try {
    const decimals = await tokenContract.methods.decimals().call();
    return decimals;
  } catch (error) {
    return 18; // Більшість токенів має 18 десяткових знаків за замовчуванням
  }
}

async function decodeTransactionSignature(transactionHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;
  const transactionReceiptURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionReceipt&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;

  try {
    const transactionData = await axios
      .get(transactionURL)
      .then((response) => response.data.result);
    const transactionReceipt = await axios
      .get(transactionReceiptURL)
      .then((response) => response.data.result);

    if (transactionData && transactionReceipt) {
      const methodSignature = transactionData.input.slice(0, 10);
      const contractAddress = transactionData.to;
      const fromAddress = transactionData.from;
      const methodName = getMethodNameBySignature(methodSignature);
      const contractType = getContractType(contractAddress);
      const gasUsed = web3.utils.hexToNumber(transactionReceipt.gasUsed);
      const gasPrice = web3.utils.hexToNumber(transactionData.gasPrice);
      const gasPriceGwei = web3.utils.fromWei(gasPrice.toString(), "gwei");
      const transactionFee = web3.utils.fromWei(
        (gasUsed * gasPrice).toString(),
        "ether"
      );

      if (methodSignature === "0x3593564c") {
        console.log(`Transaction Hash: ${transactionHash}`);
        console.log(`From: ${fromAddress}`);
        console.log(`Contract Type: ${contractType}`);
        console.log(`Method Signature: ${methodSignature}`);
        console.log(`Method Name: ${methodName}`);

        const transferEvents = transactionReceipt.logs.filter(
          (log) =>
            log.topics[0] ===
            web3.utils.sha3("Transfer(address,address,uint256)")
        );

        let swapDetails = [];
        let swapsArray = [];
        let tokensTransERC20 = [];
        let firstTransfer = null;
        let secondTransfer = null;

        for (let i = 0; i < transferEvents.length; i++) {
          const event = transferEvents[i];
          const from = `0x${event.topics[1].slice(26)}`;
          const to = `0x${event.topics[2].slice(26)}`;
          const tokenAddress = event.address;
          const tokenSymbol = await getTokenSymbol(tokenAddress);
          const decimals = await getTokenDecimals(tokenAddress);

          const value = BigInt(event.data);
          const factor = BigInt(10) ** BigInt(decimals);
          const wholePart = value / factor;
          const fractionalPart = value % factor;

          let fractionalPartStr = fractionalPart
            .toString()
            .padStart(Number(decimals), "0");

          let adjustedValue = `${wholePart.toString()}.${fractionalPartStr}`;

          swapDetails.push({
            from,
            to,
            value: adjustedValue,
            tokenSymbol,
          });

          tokensTransERC20.push({
            value: adjustedValue,
            tokenSymbol: tokenSymbol,
          });

          // Логіка для "Swap for"
          if (transferEvents.length === 2 && i === 1) {
            const swapForEntry = `Swap for ${adjustedValue} ${tokenSymbol}`;
            swapsArray.push(swapForEntry);
            console.log(swapForEntry);
            tokensTransERC20.push(swapForEntry);
          } else if (
            to.toLowerCase() === "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad"
          ) {
            const swapForEntry = `Swap for ${adjustedValue} ${tokenSymbol}`;
            swapsArray.push(swapForEntry);
            console.log(swapForEntry);
            tokensTransERC20.push(swapForEntry);
          }

          // Логіка для "Swap"
          if (firstTransfer && secondTransfer) {
            if (firstTransfer.tokenSymbol === secondTransfer.tokenSymbol) {
              const largerValue =
                BigInt(firstTransfer.value.replace(".", "")) >
                BigInt(secondTransfer.value.replace(".", ""))
                  ? firstTransfer.value
                  : secondTransfer.value;
              const swapEntry = `Swap ${largerValue} ${firstTransfer.tokenSymbol}`;
              swapsArray.push(swapEntry);
              console.log(swapEntry);
              tokensTransERC20.push(swapEntry);
            } else {
              const swapEntry = `Swap ${firstTransfer.value} ${firstTransfer.tokenSymbol}`;
              swapsArray.push(swapEntry);
              console.log(swapEntry);
              tokensTransERC20.push(swapEntry);
            }
          }

          if (i === 0) {
            firstTransfer = { value: adjustedValue, tokenSymbol };
          } else if (i === 1) {
            secondTransfer = { value: adjustedValue, tokenSymbol };
          }
        }

        console.log(`Transaction Fee: ${transactionFee} ETH`);
        console.log(
          `Gas Price: ${gasPriceGwei} Gwei (${web3.utils.fromWei(
            gasPrice.toString(),
            "ether"
          )} ETH)`
        );

        console.log("swapsArray:");
        console.log(swapsArray); // Виводимо масив з "Swap for" і "Swap"

        console.log("swapDetails:");
        console.log(tokensTransERC20); // Виводимо повний масив з "tokensTransERC20"

        const firstSwapToken = swapsArray[0].split(" ").slice(-1)[0];
        const firstSwapValue = swapsArray[0].split(" ").slice(-2)[0];
        const secondSwapToken = swapsArray[1].split(" ").slice(-1)[0];
        const secondSwapValue = swapsArray[1].split(" ").slice(-2)[0];

        const checkSecondSAindex = swapsArray[1]
          .split(" ")
          .slice(0, 2)
          .join(" ")
          .trim();

        const tokenSymbols = swapDetails
          .filter((item) => typeof item === "object" && item.tokenSymbol)
          .map((item) => item.tokenSymbol);
        const uniqueTokenSymbols = new Set(tokenSymbols);
        const hasTwoTokenSymbols = uniqueTokenSymbols.size === 2; // Перевіряємо чи є лише 2 унікальні символи

        // Uniswap V3
        if (
          firstSwapToken === secondSwapToken &&
          firstSwapValue === secondSwapValue
        ) {
          const tokenValue = swapDetails[1].value;
          const tokenSymbol = swapDetails[1].tokenSymbol;

          console.log("----------------------------------------------------");
          console.log(`Uniswap v3`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(`Swap ${tokenValue} ${tokenSymbol}`);
          console.log(`${swapsArray[0]}`);
          console.log("----------------------------------------------------");
        } else if (
          // Uniswap V3 + Uniswap V3
          checkSecondSAindex === "Swap for" &&
          firstSwapToken === swapDetails[0].tokenSymbol &&
          firstSwapValue === swapDetails[0].value &&
          hasTwoTokenSymbols === false
        ) {
          console.log("----------------------------------------------------");
          console.log(`Uniswap v3+v3/v3+v2`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(
            `Swap ${swapDetails[1].value} ${swapDetails[1].tokenSymbol}`
          );
          console.log(`${swapsArray[1]}`);
          console.log("----------------------------------------------------");
        } else if (
          // Uniswap V3 + Uniswap V3 - liquidity
          checkSecondSAindex === "Swap for" &&
          firstSwapToken === swapDetails[0].tokenSymbol &&
          firstSwapValue === swapDetails[0].value &&
          hasTwoTokenSymbols === true
        ) {
          console.log("----------------------------------------------------");
          console.log(`Uniswap v3+v3/v3+v2 - liquidity`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(`loquidity`);
          console.log("----------------------------------------------------");
        } else if (
          // Uniswap V2 + Uniswap V3
          checkSecondSAindex === "Swap for" &&
          firstSwapToken !== swapDetails[0].tokenSymbol &&
          firstSwapValue !== swapDetails[0].value &&
          hasTwoTokenSymbols === false
        ) {
          console.log("----------------------------------------------------");
          console.log(`Uniswap v2+v3`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(
            `Swap ${swapDetails[0].value} ${swapDetails[0].tokenSymbol}`
          );
          console.log(`${swapsArray[1]}`);
          console.log("----------------------------------------------------");
        } else if (
          // Uniswap V2 + Uniswap V3 - liquidity
          checkSecondSAindex === "Swap for" &&
          firstSwapToken !== swapDetails[0].tokenSymbol &&
          firstSwapValue !== swapDetails[0].value &&
          hasTwoTokenSymbols === true
        ) {
          let swapForTotal = 0;
          let tokenNames = [];

          swapsArray.forEach((swap) => {
            if (swap.startsWith("Swap for")) {
              const ethValue = parseFloat(swap.split(" ")[2]);
              swapForTotal += ethValue;
            }
          });

          swapsArray.forEach((swap) => {
            if (swap.startsWith("Swap for")) {
              const tokenName = swap.split(" ").pop();
              tokenNames.push(tokenName);
            }
          });

          const swapForCount = swapsArray.filter((item) =>
            item.startsWith("Swap for")
          ).length;

          // Знаходимо назву токена для "Swap"
          const swapToken = swapsArray
            .find(
              (item) => item.startsWith("Swap") && !item.startsWith("Swap for")
            )
            .split(" ")[2];

          // Фільтруємо перші два значення в swapDetails, які мають tokenSymbol рівний swapToken
          let ethSwaps = swapDetails
            .filter(
              (item) =>
                typeof item === "object" && item.tokenSymbol === swapToken
            )
            .slice(0, swapForCount);

          // Обчислюємо суму value для перших двох swapToken
          const totalValue = ethSwaps.reduce(
            (sum, current) => sum + parseFloat(current.value),
            0
          );

          console.log("----------------------------------------------------");
          console.log(`Uniswap v2+v3 - liquidity`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(`Swap ${totalValue} ${swapToken}`);
          console.log(`Swap for ${swapForTotal} ${tokenNames[0]}`);
          console.log("----------------------------------------------------");
        } else {
          // Uniswap V2 / Uniswap V2 + Uniswap V2
          console.log("----------------------------------------------------");
          console.log(`Uniswap v2/v2+v2`);
          console.log(`Transaction Hash: ${transactionHash}`);
          console.log("----------------------------------------------------");
          console.log(`From: ${fromAddress}`);
          console.log(`Swap ${secondSwapValue} ${secondSwapToken}`);
          console.log(`${swapsArray[0]}`);
          console.log("----------------------------------------------------");
        }
      } else {
        console.log("Unknown method signature");
      }
    } else {
      console.log("Транзакцію не знайдено.");
    }
  } catch (error) {
    console.error("Помилка під час отримання даних транзакції:", error);
  }
}

const transactionHash =
  "0x863573ba12bc5139d90a5d76ad6e21127b222877f5c3271b7478262aa607e092";
decodeTransactionSignature(transactionHash);

/* 
https://etherscan.io/tx/0xa405a7b02b6d6c817ebb817007537afa21506d38bf647061cb55d7c0fad75023 - v3+2 - error, need fix it
https://etherscan.io/tx/0xf81c940c7b3c2d9158c4366fcab216c89ae4f9ba3c1865bbe79fefb69836935a - v2+3 - error, need fix it
https://etherscan.io/tx/0xa8a6d8401bd87ed1976479e1d2ab2232faa4e01091dfe6101ca1c43753734818 - v2+3 - error, need fix it
https://etherscan.io/tx/0x576f59fb241510803a3f3ed28510d81d1fcb2e77c290157f67f42ff6264d09e4 - v2+3 - error, need fix it 
https://etherscan.io/tx/0xf16052831ba145f338a7104dc5d226c47eac13066cf7e3e7d8b07b901f31b565 - v2+3 - error, need fix it
https://etherscan.io/tx/0xc6d99ea8e161c7908a97cad4c1f8d1b42ccaae8c465f58b2c6bdd8df1c343b8c - v2 - error, need fix it
https://etherscan.io/tx/0xb7d9c03294e95490d5acaf4ffaa1949142dc055cd4b6b94f8c8f3c71f6ed2c0d - v2 - error, need fix it
https://etherscan.io/tx/0x29dc8bb5ea0d4a1ff13a2f3346034092c639143e08e9395108b5d89a5e81339d - v2 - error, need fix it
https://etherscan.io/tx/0x5b698547e367ce6e3f33a547994cf3f72f5a9483e88fd43efa220bea32196351 - v2 - ok
https://etherscan.io/tx/0x7d3b828d5e8a1063b430d1adbf2dde3d1f192578723808c535ab45b18998def3 - v2+v2 - error, need fix it


https://etherscan.io/tx/0xbdc46542b9e02b7e84cf06b857fdee994d671f1f6958f2bf1c1c49a9f786cba8 - v3+2 +
https://etherscan.io/tx/0x1ea17d327f60f96b9093e13010ba1d7eaad8cee160b903772ce8e3f56f1395b3 - v3+2 +
https://etherscan.io/tx/0x2600974169fd76c6a49d4935f0e89bf6313fb8e7440baaa279ac30ef2f88ba18 - v3+2 +
https://etherscan.io/tx/0x92878f100f1f465cab672242b2d0cdeb5aaabad276ba917737a3e1d282c006cc - v3 - done
https://etherscan.io/tx/0x4438d2d1eb3497903013ffd77df11a6c748a40491c073fc316318980ac244521 - v3 - done
https://etherscan.io/tx/0x1864da167aa1891653d878199c64e53fabd88b4a38817dd4d2d927ca7863c16e - v3+v3 +
https://etherscan.io/tx/0xe89fc4876c799efcac43d59502938ea324c0957bcc5b08c6e90bf51792a25d80 - v3 - done
https://etherscan.io/tx/0xd3e3a4095df7a6ea2dd3a9c64010379d26ccdb1ed5156a5ac1f0e61ba6a3cb90 - v3 - done
https://etherscan.io/tx/0x0147dfca5f28bdbc67012608a1c2019d7cd5196f306913ead1bf5b5a29b4cfaa - v3 - done
---------------------------------
https://etherscan.io/tx/0xb3a44af2473fa53f263c60b08c2da8c017faf726b0b0a59effcf53173620c70d - v3+v3 +
---------------------------------
https://etherscan.io/tx/0xfb61b9580fa08c2fc43e3f4feef28dc9934538a5038fa85a5bf8a76947555df3 - v2+v2 +
*/
