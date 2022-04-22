import Head from 'next/head'
import Image from 'next/image'
import Web3Modal from 'web3modal'
import { Contract, providers } from 'ethers'
import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Home.module.css'
import { WHITELIST_CONTRACT_ADDRESS, abi } from '../constants'

export default function Home() {

  // walletConnected keep track of whether the user's wallect is connected or not
  const [walletConnected, setWalletConnected] = useState(false)

  // joinedWhitelist keeps track of whether 
  const [joinedWhitelist, setJoinedWhitelist] = useState(false)

  // loading is set to ture when we are waiting for transaction is mined
  const [loading, setLoading] = useState(false)

  // numberOfWhitelisted tracks the number of addresses's whitelisted
  const [numberOfWhitelisted, setNumberOfWhitelisted] = useState(0)

  // create a reference of the Web3 Modal(used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef()

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)


    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork()
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }

    return web3Provider
  }

  const addAddressToWhitelist = async () => {
    try {
      // we need signer since this is a write transaction
      const signer = await getProviderOrSigner(true)
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        signer
      )
      // call the addAddressToWhitelist from the contract
      const tx = await whitelistContract.addAddressToWhitelist();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false)
      // get the updated number of addresses in the whitelist
      await getNumberOfWhitelisted();
      setJoinedWhitelist(true)
    } catch (error) {
      console.error(error)
    }
  }


  const getNumberOfWhitelisted = async () => {
    try {
      // get provider from Web3Modal in case we can read transaction
      const provider = await getProviderOrSigner(false)
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        provider
      )
      const numberOfWhitelisted = await whitelistContract.numAddressesWhitelisted()
      setNumberOfWhitelisted(numberOfWhitelisted)
    } catch (error) {
      console.error(error)
    }
  }

  const checkIfAddressInWhitelist = async () => {
    try {
      // we need signer later to get user's address
      const signer = await getProviderOrSigner(true)
      console.log(signer)
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        signer
      )
      const address = await signer.getAddress()
      const joinedWhitelist = await whitelistContract.whitelistedAddresses(address)
      setJoinedWhitelist(joinedWhitelist)
    } catch (error) {
      console.error(error)
    }
  }

  const connectWallet = async () => {
    try {
      // get provider from Web3Modal, when used for the frist time, the wallet prompts user to connect
      await getProviderOrSigner(false)
      setWalletConnected(true)
      checkIfAddressInWhitelist()
      getNumberOfWhitelisted()
    } catch (error) {
      console.error(error)
    }
  }
  
  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
    }
  }, [walletConnected]);

   /*
    renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    if (walletConnected) {
      if (joinedWhitelist) {
        return (
          <div className={styles.description}>
            Thanks for joining the Whitelist!
          </div>
        );
      } else if (loading) {
        return <button className={styles.button}>Loading...</button>;
      } else {
        return (
          <button onClick={addAddressToWhitelist} className={styles.button}>
            Join the Whitelist
          </button>
        );
      }
    } else {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
  };
  
  return (
    <div>
      <Head>
        <title>Whitelist Dapp</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {numberOfWhitelisted} have already joined the Whitelist
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./crypto-devs.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
