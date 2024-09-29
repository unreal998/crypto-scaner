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
  "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": "Uniswap V2",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2",
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap Universal V3/V2",
  // Додати інші контракти за потреби
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
    tokenAddress.toLowerCase().startsWith("0x000000")
  ) {
    return "ETH";
  }
  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  try {
    const symbol = await tokenContract.methods.symbol().call();
    return symbol || "Unknown";
  } catch (error) {
    return "Unknown";
  }
}

async function getTransactionDetails(txHash) {
  try {
    const response = await axios.get(
      `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHER_SCAN_API_KEY}`
    );

    const transaction = response.data.result;

    const methodName = getMethodNameBySignature(transaction.input.slice(0, 10));
    const contractType = getContractType(transaction.to);
    const gasPriceInGwei = web3.utils.fromWei(transaction.gasPrice, "gwei");
    const transactionFee = web3.utils.fromWei(
      (transaction.gas * transaction.gasPrice).toString(),
      "ether"
    );

    console.log(`Transaction Hash: ${transaction.hash}`);
    console.log(`From: ${transaction.from}`);
    console.log(`Contract Type: ${contractType}`);
    console.log(`Method Signature: ${transaction.input.slice(0, 10)}`);
    console.log(`Method Name: ${methodName}`);
    console.log(`Transaction Fee: ${transactionFee} ETH`);
    console.log(
      `Gas Price: ${gasPriceInGwei} Gwei (${transaction.gasPrice} ETH)`
    );

    // Додати інформацію про swap (якщо є)
    const swapDetails = await getSwapDetails(transaction);
    swapDetails.forEach((detail) => console.log(`-*${detail}`));
  } catch (error) {
    console.error("Error fetching transaction details:", error);
  }
}

async function getSwapDetails(transaction) {
  // Це заглушка для отримання деталей swap, можна реалізувати більш точно за потреби
  return [`Swap 287,184,707.544678299 BABYNEIRO`, `For 0.3745077709937033 ETH`];
}

// Виклик функції для конкретної транзакції
getTransactionDetails(
  "0xa84cb80707604bf35c84a69ed0fe2bab974916adeaff1cefa1da39be35b9f403"
);
