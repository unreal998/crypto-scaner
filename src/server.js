import express, { json, urlencoded } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import Web3 from "web3";
import fs from "fs"; // Модуль для роботи з файлами

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
const logFilePath = path.join(__dirname, "transactions_shorts.txt"); // Шлях до файлу для запису

// Функція для запису даних у файл
function logToFile(data) {
  fs.appendFile(logFilePath, data + "\n", (err) => {
    if (err) {
      console.error("Помилка запису в файл:", err);
    }
  });
}

// Функція для перевірки кількості токенів через події Transfer
async function containsMultipleTokens(txHash) {
  try {
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    const transferEvents = receipt.logs.filter(
      (log) =>
        log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)")
    );

    // Якщо більше однієї події Transfer, значить задіяно кілька токенів
    return transferEvents.length > 1;
  } catch (error) {
    console.error("Помилка під час отримання подій Transfer:", error);
    return false;
  }
}

// Функція для отримання останнього блоку і його транзакцій
async function getLastTransactions() {
  try {
    const latestBlock = await web3.eth.getBlock("latest");

    // Перевіряємо, чи блок новий
    if (lastCheckedBlock !== latestBlock.number) {
      lastCheckedBlock = latestBlock.number;

      // Обробляємо кожну транзакцію
      for (const txHash of latestBlock.transactions) {
        const transaction = await web3.eth.getTransaction(txHash);

        // Отримуємо відправника транзакції
        const fromAddress = transaction.from;

        // Сигнатура методу - це перші 4 байти від поля input
        const methodSignature = transaction.input.slice(0, 10); // 0x + 8 символів (4 байти)

        // Перевіряємо, чи є кілька токенів через події Transfer
        const isMultipleTokens = await containsMultipleTokens(txHash);

        // Якщо кілька токенів, додаємо "+" перед хешем
        const logData = `${
          isMultipleTokens ? "+" : ""
        }hash: '${txHash}', from: '${fromAddress}', method signature: '${methodSignature}'`;
        console.log(logData); // Виводимо в консоль
        logToFile(logData); // Записуємо в файл
      }
    } else {
      console.log("Немає нових блоків...");
    }
  } catch (error) {
    console.error("Помилка під час отримання транзакцій:", error);
  }
}

// Запуск перевірки нових транзакцій кожні 2 секунди
setInterval(() => {
  getLastTransactions();
}, 2000);

export default server;
