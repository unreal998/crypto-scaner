import Web3 from "web3";
import axios from "axios";
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from "../constants.js";

const web3 = new Web3(
  "https://mainnet.infura.io/v3/1be75a3378bf4f9e9a9c7a0a9672942b"
);

// Функція для отримання сигнатури транзакції
export default async function decodeTransactionSignature(transactionHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`;

  try {
    const transactionData = await axios
      .get(transactionURL)
      .then((response) => response.data.result);

    if (transactionData) {
      const methodSignature = transactionData.input.slice(0, 10);
      console.log(`Method Signature: ${methodSignature}`);
    } else {
      console.log("Транзакцію не знайдено.");
    }
  } catch (error) {
    console.error("Помилка під час отримання даних транзакції:", error);
  }
}

/* const transactionHash =
  "0x028fe255c8c16e8cb9aa3065b26a6ccab3c73df85e8fb39a52e9164006033e77";
decodeTransactionSignature(transactionHash); */
