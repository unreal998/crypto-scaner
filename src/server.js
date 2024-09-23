import express, { json, urlencoded } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import Web3, { Contract, eth } from "web3";
import rateLimit from 'axios-rate-limit';
import axios from "axios";
import { Interface  } from 'ethers';
import { ETHER_SCAN_API_KEY, ETHER_SCAN_API_ENDPOINT } from './constants.js';

const app = express();
const __dirname = path.resolve();
const SRC_FOLDER = path.join(__dirname, "src");

//MIDDLEWARE
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.set("trust proxy", true);

const server = http.createServer(app);

const web3 = new Web3('https://mainnet.infura.io/v3/1be75a3378bf4f9e9a9c7a0a9672942b');
const web3Socket = new Web3('wss://sepolia.infura.io/ws/v3/1be75a3378bf4f9e9a9c7a0a9672942b');
const axiosLimitCals = rateLimit(axios.create(), { maxRequests: 5, perMilliseconds: 1200 });


async function getLastTransactions() {
  return await web3.eth.getBlock('latest').then((block) => {
    return block.transactions;
  }).catch((error) => {
    console.error(error);
  });
}

async function getTransactionData(transactionHash) {
  const transactionURL = `${ETHER_SCAN_API_ENDPOINT}?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHER_SCAN_API_KEY}`
  const encodedTransactionData = await axiosLimitCals.get(transactionURL).then(data => {
    return data.data.result;
  })
  // const encodedTransactionData = await web3.eth.getTransaction(transactionHash);
  if (encodedTransactionData?.input !== '0x') {
    const abiURL = `${ETHER_SCAN_API_ENDPOINT}?module=contract&action=getabi&address=${encodedTransactionData.to}&apikey=${ETHER_SCAN_API_KEY}`;
    const abiContractData = await axiosLimitCals.get(abiURL).then(data => {
      return data.data.result;
    })
    if (abiContractData !== 'Contract source code not verified' && abiContractData !== 'Invalid Address format') {
      const abi = JSON.parse(abiContractData);
      // const iface = new Interface(abi);
      const contract = new web3.eth.Contract(abi, encodedTransactionData.to)
      console.log("==contract.methods===", contract.methods)
      if (contract.methods.name) {
        contract.methods.name().call()
          .then((result) => {
            console.log("Token Name:", result);
          })
          .catch((error) => {
            console.error("Error fetching token name:", error);
          });
        contract.methods.balanceOf().call()
          .then((result) => {
            console.log("Token balance:", result);
          })
          .catch((error) => {
            console.error("Error fetching token name:", error);
          });
      }
      contract.getPastEvents('Transfer', {
        fromBlock: '0',
        toBlock: 'latest'
      }, (error, events) => {
          if (!error) {
              events.forEach(event => {
                  console.log(`From: ${event.returnValues.from}`);
                  console.log(`To: ${event.returnValues.to}`);
                  console.log(`Value: ${web3.utils.fromWei(event.returnValues.value, 'ether')} tokens`);
              });
          }
      });
    

      // const inputData = encodedTransactionData.input;
      // const decodedData = iface.parseTransaction({ data: inputData });
      // console.log("=decodedData==", decodedData);
    }
  }
}

getLastTransactions().then((data) => {
  data.forEach(element => {
    getTransactionData(element)
  });
})

export default server;
