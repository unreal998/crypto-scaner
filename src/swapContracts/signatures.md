HANA - x

- swapExactTokensForTokens:
  Сигнатура: 0x38ed1739
  Опис: Ця функція обмінює певну кількість одного токена на мінімальну кількість іншого токена. Використовується, коли ви точно знаєте, скільки токенів ви хочете продати, але не знаєте точної кількості, яку отримаєте.

- swapExactETHForTokens:
  Сигнатура: 0x7ff36ab5
  Опис: Обмінює певну кількість ETH на мінімальну кількість токенів. Використовується для обміну ETH на інші токени.

- swapExactTokensForETH:
  Сигнатура: 0x18cbafe5
  Опис: Обмінює певну кількість токенів на мінімальну кількість ETH.

- swapTokensForExactTokens:
  Сигнатура: 0x8803dbee
  Опис: Обмінює мінімально необхідну кількість одного токена для отримання точної кількості іншого токена.

- swapETHForExactTokens:
  Сигнатура: 0xfb3bdb41
  Опис: Обмінює ETH на точно визначену кількість токенів.

- swapTokensForExactETH:
  Сигнатура: 0x4a25d94a
  Опис: Обмінює мінімально необхідну кількість токенів для отримання точної кількості ETH.

"0xf305d719": "addLiquidityETH",
"0xe8e33700": "addLiquidity",
"0x5c11d795": "addLiquidityETHWithPermit",
"0x3d0e3ec5": "removeLiquidityETH",
"0x2f100e4a": "removeLiquidityETHWithPermit",
"0x02751cec": "removeLiquidityETHSupportingFeeOnTransferTokens",
"0xaf2979eb": "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
"0xbaa2abde": "removeLiquidity",
"0xded9382a": "removeLiquidityWithPermit",
"0x38ed1739": "swapExactTokensForTokens (OK - default)",
"0x8803dbee": "swapTokensForExactTokens (OK - default)",
"0x7ff36ab5": "swapExactETHForTokens (OK - default)",
"0xfb3bdb41": "swapTokensForExactETH (OK - default)",
"0x18cbafe5": "swapExactTokensForETH (OK - default)",
"0x4a25d94a": "swapETHForExactTokens (OK - default)",
"0x791ac947": "swapExactTokensForTokensSupportingFeeOnTransferTokens (fee)",
"0xb6f9de95": "swapExactETHForTokensSupportingFeeOnTransferTokens (fee)",
"0x5c11d795": "swapExactTokensForETHSupportingFeeOnTransferTokens (fee)",
"0x088890dc": "F: swapExactETHForTokensSupportingFeeOnTransferTokens (fee)",
"0x05eb5327": "F: swapExactYtForToken (fee)",
"0x5d3e105c": "F: swapTokenToToken (OK - default)",
"0x876a02f6": "F: swapExactAmountInOnUniswapV3 (unknown)",

const contractTypes = {
// Uniswap V2 Contracts
"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": "Uniswap V2",
"0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2",
"0xeedff72a683058f8ff531e8c98575f920430fdc5": "Uniswap V2",
"0xd744c01ed82c61fa8cd1bfac89c988292ff5e0da": "Uniswap V2",
"0xf256a4a0031970fd2e65fea80482bd61a0ca6197": "Uniswap V2",
"0xc0e6eef914d7bb0d4e6f72bc64ed69383fdb06e4": "Uniswap V2",

"0x1f98431c8ad98523631ae4a59f267346ea31f984": "Uniswap V3",
"0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3",
"0xc36442b4a4522e871399cd717abdd847ab11fe88": "Uniswap V3",
"0xe331de28cd81b768c19a366b0e4e4675c45ec2da": "Uniswap V3",
"0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap Universal V3/V2",

// SushiSwap Contracts
"0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": "SushiSwap Router",

//Metamask
"0x881d40237659c251811cec9c364ef91dc08d300c": "Metamask",
"0x74de5d4fcbf63e00296fd95d33236b9794016631": "MetaMask",

//Uses woth Fees!!!!
//Maestro
"0x80a64c6d7f12c47b7c66c5b4e20e72bc1fcd5d9e": "Maestro: Router 2",

//ParaSwap: Augustus V6.2
"0x6a000f20005980200259b80c5102003040001068": "ParaSwap: Augustus V6.2",
};

ось транзакція
https://etherscan.io/tx/0xa84cb80707604bf35c84a69ed0fe2bab974916adeaff1cefa1da39be35b9f403

напиши функцію яка буде виводити наступне

Transaction Hash: 0xa84cb80707604bf35c84a69ed0fe2bab974916adeaff1cefa1da39be35b9f403
From: 0x0e0bc562869ac7cb7cd1783db0306934aa6f420d
Contract Type: Uniswap Universal V3/V2
Method Signature: 0x3593564c
Method Name: EXECUTE - Swap
Transaction Fee: 0.002548741451862957 ETH
Gas Price: 13.059151053 Gwei (0.000000013059151053 ETH) -*Swap 287,184,707.544678299 BABYNEIRO -*For 0.3745077709937033 ETH
