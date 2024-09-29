import Web3 from "web3";
import axios from "axios";
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from "../constants.js";

// Ініціалізація Web3 з Infura або іншим провайдером
const web3 = new Web3(
  "https://mainnet.infura.io/v3/1be75a3378bf4f9e9a9c7a0a9672942b"
);

// ERC-20 ABI для отримання інформації про токен (символ та ім'я)
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
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

// SushiSwap V2 ABI для розпізнавання методів свопу
const SUSHISWAP_V2_ROUTER_ABI = [
  {
    constant: false,
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Функція для отримання символу токена за адресою контракту
async function getTokenSymbol(tokenAddress) {
  const knownAddresses = {
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH", // Нативний Ethereum (ETH)
    "0xc02aaaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH", // Wrapped Ether (WETH)
  };

  if (knownAddresses[tokenAddress]) {
    return knownAddresses[tokenAddress]; // Повертаємо відомий символ для спеціальних адрес
  }

  try {
    const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    return await tokenContract.methods.symbol().call();
  } catch (error) {
    console.error(
      `Error fetching token symbol for address: ${tokenAddress}`,
      error
    );
    return "Unknown Token";
  }
}

// Функція для декодування подій Transfer з логів транзакції
async function decodeTransactionLogs(logs) {
  const transferEventSignature = web3.utils.sha3(
    "Transfer(address,address,uint256)"
  );

  for (const log of logs) {
    if (log.topics[0] === transferEventSignature) {
      const tokenAddress = log.address.toLowerCase();
      const from = `0x${log.topics[1].slice(26)}`;
      const to = `0x${log.topics[2].slice(26)}`;
      const value = web3.utils.fromWei(log.data, "ether");

      // Отримуємо символ токена асинхронно
      const tokenSymbol = await getTokenSymbol(tokenAddress);

      // Виводимо інформацію про трансфер
      console.log(`Transfer Event Detected:
      From: ${from}
      To: ${to}
      Value: ${value}
      Token Address: ${tokenAddress}
      Token: ${tokenSymbol}`);
    }
  }
}

// Основна функція для отримання та розкодування транзакції
async function getTransactionDataByHash(transactionHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;
  const transactionReceiptURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionReceipt&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;

  const transactionData = await axios
    .get(transactionURL)
    .then((response) => response.data.result);

  const receiptData = await axios
    .get(transactionReceiptURL)
    .then((response) => response.data.result);

  const input = transactionData.input;
  const methodSignature = input.slice(0, 10);

  console.log(`Transaction Method Signature: ${methodSignature}`);

  // Використовуємо ABI для декодування SushiSwap swapExactTokensForTokens
  if (methodSignature === "0x38ed1739") {
    const decodedParams = web3.eth.abi.decodeParameters(
      [
        { type: "uint256", name: "amountIn" },
        { type: "uint256", name: "amountOutMin" },
        { type: "address[]", name: "path" },
        { type: "address", name: "to" },
        { type: "uint256", name: "deadline" },
      ],
      input.slice(10)
    );

    const sellTokenAddress = decodedParams.path[0].toLowerCase();
    const buyTokenAddress =
      decodedParams.path[decodedParams.path.length - 1].toLowerCase();

    // Отримуємо символи токенів
    const sellTokenSymbol = await getTokenSymbol(sellTokenAddress);
    const buyTokenSymbol = await getTokenSymbol(buyTokenAddress);

    console.log("Decoded Parameters:");
    console.log(`Sell Token: ${sellTokenSymbol} (${sellTokenAddress})`);
    console.log(`Buy Token: ${buyTokenSymbol} (${buyTokenAddress})`);

    const sellAmount = web3.utils.fromWei(decodedParams.amountIn, "ether");
    const minBuyAmount = web3.utils.fromWei(
      decodedParams.amountOutMin,
      "ether"
    );

    console.log(`Sell Amount: ${sellAmount} ${sellTokenSymbol}`);
    console.log(`Min Buy Amount: ${minBuyAmount} ${buyTokenSymbol}`);

    // Додаткова інформація про транзакцію
    const gasUsed = receiptData.gasUsed;
    const gasPrice = transactionData.gasPrice;
    const transactionFee = web3.utils.fromWei(
      (gasUsed * gasPrice).toString(),
      "ether"
    );

    const value = web3.utils.fromWei(transactionData.value, "ether");

    console.log(`Transaction Value: ${value} ETH`);
    console.log(`Gas Price: ${web3.utils.fromWei(gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${transactionFee} ETH`);

    // Отримуємо логи подій транзакції
    await decodeTransactionLogs(receiptData.logs);
  } else {
    console.log("Unknown method signature");
  }
}

// Хеш транзакції
const transactionHash =
  "0x480b9be1635aa344db644a1093211cd6f026fc5e957f0a977f4e2388fad40e6b";

// Виклик функції
getTransactionDataByHash(transactionHash);
