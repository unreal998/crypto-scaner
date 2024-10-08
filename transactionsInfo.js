import Web3 from "web3";
import axios from "axios";
import BigNumber from "bignumber.js"; // Імпортуємо бібліотеку bignumber.js
import {
  ETHER_SCAN_API_KEY,
  ETHER_SCAN_API_ENDPOINT,
} from "./src/constants.js";

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

async function getTokenSymbol(tokenAddress) {
  if (
    tokenAddress.toLowerCase() ===
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    tokenAddress.toLowerCase() === "0xc02aaaa39b223fe8d0a0e5c4f27ead9083c756cc"
  ) {
    return "ETH";
  }

  if (
    tokenAddress.toLowerCase() === "0xeec55f2f009d2a94d6a181bc49c830f649aba94f"
  ) {
    return "INTX";
  }

  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  try {
    const symbol = await tokenContract.methods.symbol().call();
    return symbol === "WETH" ? "ETH" : symbol;
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
    return 18;
  }
}

export async function transactionsInfo(txHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHER_SCAN_API_KEY}`;
  const transactionReceiptURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHER_SCAN_API_KEY}`;

  try {
    const transactionData = await axios
      .get(transactionURL)
      .then((response) => response.data.result);
    const transactionReceipt = await axios
      .get(transactionReceiptURL)
      .then((response) => response.data.result);

    if (transactionData && transactionReceipt) {
      const fromAddress = transactionData.from;

      const transferEvents = transactionReceipt.logs.filter(
        (log) =>
          log.topics[0] === web3.utils.sha3("Transfer(address,address,uint256)")
      );

      let lastTwoSwaps = []; // Для зберігання останніх двох подій

      for (let i = 0; i < transferEvents.length; i++) {
        const event = transferEvents[i];
        const from = `0x${event.topics[1].slice(26)}`;
        const to = `0x${event.topics[2].slice(26)}`;
        const tokenAddress = event.address;
        const tokenSymbol = await getTokenSymbol(tokenAddress);
        const decimals = await getTokenDecimals(tokenAddress);

        const value = new BigNumber(event.data); // Використовуємо BigNumber
        const factor = new BigNumber(10).pow(decimals); // 10^decimals
        const adjustedValue = value.dividedBy(factor); // Ділимо без заокруглення

        // Якщо це перша частина свопу, виводимо інформацію
        if (from.toLowerCase() === fromAddress.toLowerCase()) {
          console.log(`Swap: ${adjustedValue.toString()} ${tokenSymbol}`);
        }

        // Зберігаємо подію
        lastTwoSwaps.push({
          adjustedValue,
          tokenSymbol,
          to,
        });

        // Якщо у нас більше двох подій, видаляємо найстарішу
        if (lastTwoSwaps.length > 2) {
          lastTwoSwaps.shift();
        }
      }

      // Якщо дві останні операції мають однаковий символ токена, сумуємо їх
      if (
        lastTwoSwaps.length === 2 &&
        lastTwoSwaps[0].tokenSymbol === lastTwoSwaps[1].tokenSymbol
      ) {
        const totalAmount = lastTwoSwaps[0].adjustedValue.plus(
          lastTwoSwaps[1].adjustedValue
        );
        console.log(
          `Swap For: ${totalAmount.toString()} ${lastTwoSwaps[0].tokenSymbol}`
        );
      } else if (lastTwoSwaps.length > 0) {
        // Якщо дві останні операції не мають однакового символа, виводимо тільки останню
        console.log(
          `Swap For: ${lastTwoSwaps[1].adjustedValue.toString()} ${
            lastTwoSwaps[1].tokenSymbol
          }`
        );
      } else {
        console.log("No tokens swapped.");
      }
    } else {
      console.log("Транзакцію не знайдено.");
      return null;
    }
  } catch (error) {
    console.error("Помилка під час отримання даних транзакції:", error);
    return null;
  }
}

transactionsInfo(
  "0x5e997029bd069aa1220189283cb9d55d59569d4269cccfbb5f45544f1bc834b9"
);
