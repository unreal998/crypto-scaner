import express, { json, urlencoded } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import Web3 from "web3";
import rateLimit from "axios-rate-limit";
import axios from "axios";
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from "./constants.js";

const app = express();
const __dirname = path.resolve();
const SRC_FOLDER = path.join(__dirname, "src");

// MIDDLEWARE
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.set("trust proxy", true);

const server = http.createServer(app);

const web3 = new Web3(
  "https://mainnet.infura.io/v3/1be75a3378bf4f9e9a9c7a0a9672942b"
);
const axiosLimitCals = rateLimit(axios.create(), {
  maxRequests: 5,
  perMilliseconds: 1200,
});

// Сигнатури функцій для свопів (Uniswap, Sushiswap та інші популярні DEX)
const SWAP_FUNCTION_SIGNATURES = [
  "0x38ed1739", // swapExactTokensForTokens
  "0x8803dbee", // swapExactETHForTokens
  "0x4a25d94a", // swapTokensForExactTokens
  "0x18cbafe5", // swapExactTokensForETH
  "0x7ff36ab5", // swapExactETHForTokensSupportingFeeOnTransferTokens
  "0x5c11d795", // swapTokensForExactETH
  "0x415565b0", // (інша своп-функція)
];

// Функція для отримання останніх транзакцій
async function getLastTransactions() {
  return await web3.eth
    .getBlock("latest")
    .then((block) => {
      return block.transactions;
    })
    .catch((error) => {
      console.error(error);
    });
}

// Функція для перевірки чи транзакція є свопом
function isSwapTransaction(input) {
  if (!input) {
    return false; // Якщо input не існує, це не своп
  }

  const methodSignature = input.slice(0, 10); // Перші 4 байти — це сигнатура методу
  return SWAP_FUNCTION_SIGNATURES.includes(methodSignature);
}

// Функція для декодування кожного поля транзакції
function decodeTransaction(transaction) {
  const decodedData = {
    blockHash: transaction.blockHash,
    blockNumber: web3.utils.hexToNumber(transaction.blockNumber),
    from: transaction.from,
    gas: web3.utils.hexToNumber(transaction.gas),
    gasPrice: web3.utils.fromWei(transaction.gasPrice, "gwei"),
    maxFeePerGas: web3.utils.fromWei(transaction.maxFeePerGas, "gwei"),
    maxPriorityFeePerGas: web3.utils.fromWei(
      transaction.maxPriorityFeePerGas,
      "gwei"
    ),
    hash: transaction.hash,
    input: transaction.input,
    nonce: web3.utils.hexToNumber(transaction.nonce),
    to: transaction.to,
    transactionIndex: web3.utils.hexToNumber(transaction.transactionIndex),
    value: web3.utils.fromWei(transaction.value, "ether"),
    type: web3.utils.hexToNumber(transaction.type),
    chainId: web3.utils.hexToNumber(transaction.chainId),
    v: transaction.v,
    r: transaction.r,
    s: transaction.s,
  };

  console.log("Decoded Transaction Fields: ", decodedData);
  return decodedData;
}

// Функція для декодування параметрів свопу
function decodeSwapParams(encodedTransactionData) {
  const methodSignature = encodedTransactionData.input.slice(0, 10);

  if (methodSignature === "0x38ed1739") {
    // swapExactTokensForTokens
    const decodedParams = web3.eth.abi.decodeParameters(
      [
        { type: "uint256", name: "amountIn" },
        { type: "uint256", name: "amountOutMin" },
        { type: "address[]", name: "path" },
        { type: "address", name: "to" },
        { type: "uint256", name: "deadline" },
      ],
      encodedTransactionData.input.slice(10)
    );

    console.log(`Swap Tokens: ${decodedParams.amountIn} input tokens`);
    console.log(`Output minimum: ${decodedParams.amountOutMin}`);
    console.log(`Path: ${decodedParams.path}`);
    console.log(`To address: ${decodedParams.to}`);
  }

  // Додати інші умови для різних методів (наприклад, swapExactETHForTokens і т.д.)
}

// Функція для отримання даних про транзакцію і декодування input
async function getTransactionData(transactionHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;
  const encodedTransactionData = await axiosLimitCals
    .get(transactionURL)
    .then((data) => {
      return data.data.result;
    });

  // Перевіряємо, чи транзакція є свопом
  if (
    encodedTransactionData &&
    encodedTransactionData.input !== "0x" &&
    isSwapTransaction(encodedTransactionData.input)
  ) {
    console.log("Swap transaction detected: ", encodedTransactionData);

    // Декодування полів транзакції
    decodeTransaction(encodedTransactionData);

    // Декодування параметрів свопу
    decodeSwapParams(encodedTransactionData);
  }
}

getLastTransactions().then((data) => {
  data.forEach((element) => {
    getTransactionData(element);
  });
});

export default server;
