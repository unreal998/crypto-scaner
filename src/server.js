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
  "https://mainnet.infura.io/v3/748fe6f1298e4171bf93bff233e9a598"
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

// Функція для отримання останнього блоку і його транзакцій
async function getLastTransactions() {
  try {
    const latestBlock = await web3.eth.getBlock("latest", true); // Отримуємо блок із транзакціями

    // Перевіряємо, чи блок новий
    if (lastCheckedBlock !== latestBlock.number) {
      lastCheckedBlock = latestBlock.number;

      // Масив для запису всіх транзакцій
      const transactionsLog = latestBlock.transactions.map((transaction) => {
        const txHash = transaction.hash;
        const fromAddress = transaction.from;
        const methodSignature = transaction.input.slice(0, 10); // Сигнатура методу - перші 4 байти

        // Формуємо дані для запису
        return `hash: '${txHash}', from: '${fromAddress}', method signature: '${methodSignature}'`;
      });

      // Записуємо всі транзакції з блоку в файл
      const logData = transactionsLog.join("\n");
      console.log(logData); // Виводимо в консоль для налагодження
      logToFile(logData); // Записуємо в файл
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
}, 6000);

export default server;
