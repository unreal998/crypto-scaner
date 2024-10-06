import * as cheerio from "cheerio";
import axios from "axios";
import BigNumber from "bignumber.js";

// Чистимо текст від непотрібних частин
const cleanText = (text) =>
  text.replace(/\s*\([^)]*\)/g, "").replace(/\sV\d+\s*$/g, "");

// Отримуємо адресу відправника (From)
const extractAddress = ($) =>
  $("a[href^='/address/']").attr("href").split("/address/")[1];

// Отримуємо вміст wrapperContent (Transaction Action)
const extractWrapperContent = ($) => {
  return $("#wrapperContent > div")
    .map(function () {
      return $(this)
        .html()
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+(>|$)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    })
    .get()
    .join(" ")
    .replace(/Click to show more Click to show less/g, "")
    .trim();
};

// Виділяємо всі swap-и
const extractSwaps = (content) =>
  content.includes("Swap")
    ? content
        .split(/(?=Swap)/)
        .filter(
          (text) =>
            text.trim() &&
            !text.includes("Aggregated") &&
            !text.includes("Swap Of")
        )
    : [];

// Сумуємо swap-и за відповідними токенами
const sumSwapAmounts = (cleanedSwaps, swapToken, swapForToken, contract) => {
  const lastSwapParts = cleanedSwaps[0].split(" ");
  const lastElement = lastSwapParts[lastSwapParts.length - 1];
  if (lastElement !== "Uniswap") {
    return { totalSwapAmount: null, totalForAmount: null, allMatches: false };
  }

  let totalSwapAmount = new BigNumber(0);
  let totalForAmount = new BigNumber(0);
  let allMatches = true;

  cleanedSwaps.forEach((swap) => {
    const swapParts = swap.split(" ");

    const currentSwapToken = swapParts[swapParts.indexOf("For") - 1];
    const currentSwapForToken = swapParts[swapParts.indexOf("On") - 1];
    const currentContract = swapParts[swapParts.indexOf("On") + 1];

    if (
      currentSwapToken === swapToken &&
      currentSwapForToken === swapForToken &&
      currentContract === contract
    ) {
      const swapAmount = new BigNumber(swapParts[1].replace(/,/g, ""));
      const forAmount = new BigNumber(
        swapParts[swapParts.indexOf("For") + 1].replace(/,/g, "")
      );
      totalSwapAmount = totalSwapAmount.plus(swapAmount);
      totalForAmount = totalForAmount.plus(forAmount);
    } else {
      allMatches = false;
    }
  });

  return { totalSwapAmount, totalForAmount, allMatches };
};

// Формуємо та виводимо результат swap-ів
const displaySwapResults = (
  swapToken,
  swapForToken,
  contract,
  totalSwapAmount,
  totalForAmount
) => {
  console.log(
    `Swap ${totalSwapAmount.toFixed()} ${swapToken} For ${totalForAmount.toFixed()} ${swapForToken} On ${contract}`
  );
};

// Обробляємо swap-и, коли їх два
const handleTwoSwaps = (cleanedSwaps, swapToken, swapForToken, contract) => {
  const firstSwap = cleanedSwaps[0].split(" ");
  const secondSwap = cleanedSwaps[1].split(" ");
  const firstValue = `${firstSwap[firstSwap.indexOf("For") + 1]} ${
    firstSwap[firstSwap.indexOf("For") + 2]
  }`;
  const secondValue = `${secondSwap[secondSwap.indexOf("Swap") + 1]} ${
    secondSwap[secondSwap.indexOf("Swap") + 2]
  }`;

  if (firstValue === secondValue) {
    console.log(
      `Swap ${firstSwap[1]} ${firstSwap[2]} For ${secondSwap
        .slice(secondSwap.indexOf("For") + 1)
        .join(" ")}`
    );
  } else {
    const { totalSwapAmount, totalForAmount, allMatches } = sumSwapAmounts(
      cleanedSwaps,
      swapToken,
      swapForToken,
      contract
    );
    if (allMatches) {
      displaySwapResults(
        swapToken,
        swapForToken,
        contract,
        totalSwapAmount,
        totalForAmount
      );
    } else {
      cleanedSwaps.forEach((swap) => console.log(swap));
    }
  }
};

// Обробляємо випадки, коли кількість swap-ів — 4 або 6
const handleMultipleSwaps = (cleanedSwaps) => {
  let sumOddSwaps = new BigNumber(0); // Використовуємо BigNumber
  let sumEvenSwaps = new BigNumber(0);
  let totalTokenOdd = new BigNumber(0);
  let totalTokenEven = new BigNumber(0);
  let swapTokenOdd, swapForTokenEven, contractOdd, contractEven;
  let conditionMet = true;

  cleanedSwaps.forEach((swap, index) => {
    const swapInfo = swap.split(" ");
    const amount = new BigNumber(swapInfo[1].replace(/,/g, ""));
    const token = swapInfo[2];
    const swapForToken = swapInfo[swapInfo.indexOf("For") - 1];
    const swapContract = swapInfo[swapInfo.indexOf("On") + 1];

    if (index % 2 === 0) {
      // Непарні swap-и
      if (
        !swapTokenOdd ||
        (swapTokenOdd === token && contractOdd === swapContract)
      ) {
        swapTokenOdd = token;
        contractOdd = swapContract;
        sumOddSwaps = sumOddSwaps.plus(amount);
        totalTokenOdd = totalTokenOdd.plus(
          new BigNumber(swapInfo[swapInfo.indexOf("For") + 1].replace(/,/g, ""))
        );
      } else {
        conditionMet = false;
      }
    } else {
      // Парні swap-и
      if (
        !swapForTokenEven ||
        (swapForTokenEven === swapForToken && contractEven === swapContract)
      ) {
        swapForTokenEven = swapForToken;
        contractEven = swapContract;
        sumEvenSwaps = sumEvenSwaps.plus(amount);
        totalTokenEven = totalTokenEven.plus(
          new BigNumber(swapInfo[swapInfo.indexOf("For") + 1].replace(/,/g, ""))
        );
      } else {
        conditionMet = false;
      }
    }
  });

  if (conditionMet) {
    console.log(
      `Swap ${sumOddSwaps.toFixed()} ${swapTokenOdd} For ${totalTokenEven.toFixed()} PRIME On ${contractEven}`
    );
  } else {
    cleanedSwaps.forEach((swap) => console.log(swap));
  }
};

// Основна функція для обробки транзакцій
async function etherscanIo(transactionHash) {
  const startTime = process.hrtime.bigint(); // Початковий час
  try {
    const response = await axios.get(
      `https://bscscan.com/tx/${transactionHash}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
        },
      }
    );
    const $ = cheerio.load(response.data);

    const fromAddress = extractAddress($);
    console.log(
      "--------------------------------------------------------------------"
    );
    console.log("From:", fromAddress);

    const wrapperContent = extractWrapperContent($);
    const cleanedSwaps = extractSwaps(wrapperContent).map(cleanText);

    if (cleanedSwaps.length === 0) {
      return console.log(
        "Transaction Action:\n",
        cleanText(wrapperContent),
        "\n--------------------------------------------------------------------"
      );
    }

    const swapInfo = cleanedSwaps[0].split(" ");
    const swapToken = swapInfo[swapInfo.indexOf("For") - 1];
    const swapForToken = swapInfo[swapInfo.indexOf("On") - 1];
    const contract = swapInfo[swapInfo.indexOf("On") + 1];

    if (cleanedSwaps.length === 2) {
      handleTwoSwaps(cleanedSwaps, swapToken, swapForToken, contract);
    } else if (cleanedSwaps.length === 4 || cleanedSwaps.length === 6) {
      handleMultipleSwaps(cleanedSwaps);
    } else {
      const { totalSwapAmount, totalForAmount, allMatches } = sumSwapAmounts(
        cleanedSwaps,
        swapToken,
        swapForToken,
        contract
      );
      if (allMatches) {
        displaySwapResults(
          swapToken,
          swapForToken,
          contract,
          totalSwapAmount,
          totalForAmount
        );
      } else {
        cleanedSwaps.forEach((swap) => console.log(swap));
      }
    }

    console.log(
      "--------------------------------------------------------------------"
    );

    // DEV OPTION
    const endTime = process.hrtime.bigint();
    const durationInNanoseconds = endTime - startTime;
    const durationInSeconds = Number(durationInNanoseconds) / 1e9;
    console.log(`Time taken: ${durationInSeconds.toFixed(3)} seconds`);
    // DEV OPTION
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
  }
}

etherscanIo(
  "0xb648b9bd1c74bcea61cb83c8ab2012fcbd7af72155f859f56372bd71c37185a0"
);

//0x2077cd55ed3a1704dada5129c4fd58ec6ea9fd57d100c6bbc1e6ff5bf72cca1c
//0x048ccb0be738693cdebeaef7ba73b92e572fd6a62086931a8fdbe08f4bc1d355
//0xd1583a852af692f275b33488ab05860afa61f38f1d314a4c473a0051c740c0a6
//0x7f640bba21ac726ac6659ce95f811deae5420c1c72af03347744c84bbe79399a
//0xaf58c7f5aba7a6494e63cf4fde44b8cd778fe26fad0a1e162d972d6af0dd926c
//0x3923ef6c88e4c8609f28b8dfa207b151a8f04348042d0cdc87c8fb658e309b10
//0xffc163817d6cdb2d2fe7c9946e1c079e9423b145cabf575d2898be29c99e87f8
//0xbeb5b282fede81f4f4d582754ffc33c880498cc2fae655f96b15c44c191f2c33
//0x574a347d4d4ecea397783fe2eeb0dffa23c55b7e69fbdf50255d3285c012abff
//0xa0609c7685fdf45f90db777216cffbb103e5765b16f92777fd0c934f765f6bde
//0x0790d65503c2011c241b59365f27c18392f125d2907b7dee8663d287af8f99b4
//0x15c97f0d9696a5df4dfa85f8e927e4e95bd639dca1b853bfe0daac7f6d732a59
