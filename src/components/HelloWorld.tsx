import { FC, useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl, TransactionInstruction, Transaction } from "@solana/web3.js";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";

interface ConnectOpts {
    onlyIfTrusted: boolean;
}

interface PhantomProvider {
    connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
    disconnect: ()=>Promise<void>;
    on: (event: PhantomEvent, callback: (args:any)=>void) => void;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction: (transaction: Transaction) => Promise<Transaction>;
    isPhantom: boolean;
    publicKey: PublicKey | null;
}

type WindowWithSolana = Window & { 
    solana?: PhantomProvider;
}

const NETWORK = clusterApiUrl("devnet");

const HelloWorld: FC = () => {

    const [ walletAvail, setWalletAvail ] = useState(false);
    const [ provider, setProvider ] = useState<PhantomProvider | null>(null);
    const [ connected, setConnected ] = useState(false);
    const [ pubKey, setPubKey ] = useState<PublicKey | null>(null);
    const connection = new Connection(NETWORK);
    // https://explorer.solana.com/address/Hisce9kT8LzZv7jsBDx1q1h8c1AoKR4K178vpSodPH7s?cluster=devnet
    const programId = new PublicKey("Hisce9kT8LzZv7jsBDx1q1h8c1AoKR4K178vpSodPH7s");

    useEffect( ()=>{
        if ("solana" in window) {
            const solWindow = window as WindowWithSolana;
            if (solWindow?.solana?.isPhantom) {
                setProvider(solWindow.solana);
                setWalletAvail(true);
                // Attemp an eager connection
                solWindow.solana.connect({ onlyIfTrusted: true });
            }
        }
    }, []);

    useEffect( () => {
        provider?.on("connect", (publicKey: PublicKey)=>{ 
            setConnected(true); 
            setPubKey(publicKey);
        });
    }, [provider]);

    const sayHelloTransaction = async () => {
      if (!pubKey) return;
      const instruction = new TransactionInstruction({
        keys: [{pubkey: pubKey, isSigner: false, isWritable: true}],
        programId,
        data: Buffer.alloc(0), // All instructions are hellos
      });
      let transaction = new Transaction().add(instruction);
      
      transaction.feePayer = pubKey;
      const anyTransaction: any = transaction;
      anyTransaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      return transaction;
    }

    const sendSayHelloTransaction = async () => {
      if (!provider) return;
      try {
        const transaction = await sayHelloTransaction();
        if (!transaction) return;
        let signed = await provider.signTransaction(transaction);
        console.log("Got signature, submitting transaction");
        let signature = await connection.sendRawTransaction(signed.serialize());
        console.log("Submitted transaction " + signature + ", awaiting confirmation");
        await connection.confirmTransaction(signature);
        console.log("Transaction " + signature + " confirmed");
      } catch (err) {
        console.log(err);
        console.log("[error] sendTransaction: " + JSON.stringify(err));
      }
    };

    return (
        <div>
            { walletAvail ?
                <>
                <button disabled={!connected} onClick={sendSayHelloTransaction}>Say Hello</button>
                </>
            :
                <>
                <p>Opps!!! Phantom is not available. Go get it <a href="https://phantom.app/">https://phantom.app/</a>.</p>
                </>
            }
        </div>
    );
}

export default HelloWorld;
