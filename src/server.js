import express, { json, urlencoded } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import Web3 from "web3";

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

let lastCheckedBlock = null; // Змінна для зберігання останнього перевіреного блоку

// Функція для отримання останнього блоку і його транзакцій
async function getLastTransactions() {
  try {
    const latestBlock = await web3.eth.getBlock("latest");

    // Перевіряємо, чи блок новий
    if (lastCheckedBlock !== latestBlock.number) {
      lastCheckedBlock = latestBlock.number;

      // Виводимо хеші транзакцій
      latestBlock.transactions.forEach((txHash) => {
        console.log(`hash: '${txHash}'`);
      });
    } else {
      console.log("Немає нових блоків...");
    }
  } catch (error) {
    console.error("Помилка під час отримання транзакцій:", error);
  }
}

// Запуск перевірки нових транзакцій кожні секунду
setInterval(() => {
  getLastTransactions();
}, 2000);

export default server;
