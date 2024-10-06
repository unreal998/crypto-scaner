import * as cheerio from "cheerio";
import axios from "axios";
import BigNumber from "bignumber.js"; // Використовуємо bignumber.js для великих чисел

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
      `handleMultipleSwaps - Swap ${sumOddSwaps.toFixed()} ${swapTokenOdd} For ${totalTokenEven.toFixed()} PRIME On ${contractEven}`
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
      `https://etherscan.io/tx/${transactionHash}`
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
    // const endTime = process.hrtime.bigint();
    // const durationInNanoseconds = endTime - startTime;
    // const durationInSeconds = Number(durationInNanoseconds) / 1e9;
    // console.log(`Time taken: ${durationInSeconds.toFixed(3)} seconds`);
    // DEV OPTION
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
  }
}

etherscanIo(
  "0x299fc01c9b7bf5babee4b70536c521108dafe6b963e7e75d0ecfaa4dcd56bca5"
);

/* 
0xa405a7b02b6d6c817ebb817007537afa21506d38bf647061cb55d7c0fad75023 - v3+2
0xf81c940c7b3c2d9158c4366fcab216c89ae4f9ba3c1865bbe79fefb69836935a - v2+3
0xa8a6d8401bd87ed1976479e1d2ab2232faa4e01091dfe6101ca1c43753734818 - v2+3
0x576f59fb241510803a3f3ed28510d81d1fcb2e77c290157f67f42ff6264d09e4 - v2+3
0xf16052831ba145f338a7104dc5d226c47eac13066cf7e3e7d8b07b901f31b565 - v2+3
0xc6d99ea8e161c7908a97cad4c1f8d1b42ccaae8c465f58b2c6bdd8df1c343b8c - v2
0xb7d9c03294e95490d5acaf4ffaa1949142dc055cd4b6b94f8c8f3c71f6ed2c0d - v2 
0x29dc8bb5ea0d4a1ff13a2f3346034092c639143e08e9395108b5d89a5e81339d - v2
0x5b698547e367ce6e3f33a547994cf3f72f5a9483e88fd43efa220bea32196351 - v2
0x7d3b828d5e8a1063b430d1adbf2dde3d1f192578723808c535ab45b18998def3 - v2+v2
0xbdc46542b9e02b7e84cf06b857fdee994d671f1f6958f2bf1c1c49a9f786cba8 - v3+2
0x1ea17d327f60f96b9093e13010ba1d7eaad8cee160b903772ce8e3f56f1395b3 - v3+2
0x2600974169fd76c6a49d4935f0e89bf6313fb8e7440baaa279ac30ef2f88ba18 - v3+2
0x1864da167aa1891653d878199c64e53fabd88b4a38817dd4d2d927ca7863c16e - v3+v3
0xd3e3a4095df7a6ea2dd3a9c64010379d26ccdb1ed5156a5ac1f0e61ba6a3cb90 - v3
0x0147dfca5f28bdbc67012608a1c2019d7cd5196f306913ead1bf5b5a29b4cfaa - v3
0xb3a44af2473fa53f263c60b08c2da8c017faf726b0b0a59effcf53173620c70d - v3+v3
0xfb61b9580fa08c2fc43e3f4feef28dc9934538a5038fa85a5bf8a76947555df3 - v2+v2
0x6ec5dffb3330cfd94b713fe3f070fd21757b8a54583263e1ddca460b9319d954 - 1inch
0x745e3d053f804afd8824cac9071b93773f1028a184b7ec255652bca7f4ff2e88 - MetaMask
0x75a59411cf6b0fbf760c5d32325aa72aaf4cb77e0f07eff40a4e015e92414952 - Transfer
0x62f4bbad73d40907c579fd7996c3db6c75a7bbdf8bc026d4d386a435be34a00e - WTF?!
0x8b6989ce3d9d6eaac079a4323b615bbaad7388b8e82c1b3466bab1cb9e6b0a08 - VIP )))
0xf7dace121e98fea65da96ab2ed7c4878552df3658552071a5cfefb219e5f5248 - error
0x50e9d88b697948f58afe2cd0b8f76792b3c60c821f2669456a28865c81ecee36 - approve
*/
