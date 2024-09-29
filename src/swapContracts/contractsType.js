import Web3 from "web3";
import axios from "axios";
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from "../constants.js";

const web3 = new Web3(
  "https://mainnet.infura.io/v3/1be75a3378bf4f9e9a9c7a0a9672942b"
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
  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  try {
    const symbol = await tokenContract.methods.symbol().call();
    return symbol === "WETH" ? "ETH" : symbol; // Примусова заміна WETH на ETH
  } catch (error) {
    return "Unknown";
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

      console.log(`Transaction Hash: ${transactionHash}`);
      console.log(`From: ${fromAddress}`);
      console.log(`Contract Type: ${contractType}`);
      console.log(`Method Signature: ${methodSignature}`);
      console.log(`Method Name: ${methodName}`);

      const transferEvents = transactionReceipt.logs.filter(
        (log) =>
          log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)")
      );
      let swapDetails = [];

      transferEvents.forEach(async (event, index) => {
        const from = `0x${event.topics[1].slice(26)}`;
        const to = `0x${event.topics[2].slice(26)}`;
        const value = web3.utils.fromWei(
          web3.utils.hexToNumberString(event.data),
          "ether"
        );
        const tokenAddress = event.address;
        const tokenSymbol = await getTokenSymbol(tokenAddress);
        swapDetails.push({ from, to, value, tokenSymbol });

        if (index === 0) {
          console.log(`Swap for ${value} ${tokenSymbol}`);
        }
        if (index === 1) {
          console.log(`Swap ${value} ${tokenSymbol}`);
        }
      });

      console.log(`Transaction Fee: ${transactionFee} ETH`);
      console.log(
        `Gas Price: ${gasPriceGwei} Gwei (${web3.utils.fromWei(
          gasPrice.toString(),
          "ether"
        )} ETH)`
      );
    } else {
      console.log("Транзакцію не знайдено.");
    }
  } catch (error) {
    console.error("Помилка під час отримання даних транзакції:", error);
  }
}

const transactionHash =
  "0xef2db703a5688871360a8af58e907b453a21ce45c0da9c1dd373477575875d5a";
decodeTransactionSignature(transactionHash);
