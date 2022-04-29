import { FC, useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, RpcResponseAndContext, AccountInfo, Commitment } from "@solana/web3.js";
import {AccountLayout, TOKEN_PROGRAM_ID, getAccount, Account} from "@solana/spl-token";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";

interface ConnectOpts {
    onlyIfTrusted: boolean;
}

interface PhantomProvider {
    connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
    disconnect: ()=>Promise<void>;
    on: (event: PhantomEvent, callback: (args:any)=>void) => void;
    isPhantom: boolean;
}

type WindowWithSolana = Window & { 
    solana?: PhantomProvider;
}

const Connect2Phantom: FC = () => {

    const [ walletAvail, setWalletAvail ] = useState(false);
    const [ provider, setProvider ] = useState<PhantomProvider | null>(null);
    const [ connected, setConnected ] = useState(false);
    const [ pubKey, setPubKey ] = useState<PublicKey | null>(null);
    const [ solBalance, setSolBalance ] = useState<number | null>(null);

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
            console.log(`connect event: ${publicKey}`);
            setConnected(true); 
            setPubKey(publicKey);

            const getSolBalance = async () : Promise<number> => {
                return new Promise((resolve) => {
                    try {
                        const connection = new Connection(clusterApiUrl("devnet"),"confirmed");
                        const balance = connection.getBalance(publicKey);
                        resolve(balance);
                    } catch(err) {
                        console.log(err);
                    }
                });
            }
            getSolBalance().then((solbalance: number) => {
                setSolBalance(solbalance/LAMPORTS_PER_SOL);
              });
            // const getKtaTokenAccount = async () : Promise<RpcResponseAndContext<{
            //     pubkey: PublicKey;
            //     account: AccountInfo<Buffer>;
            // }[]>> => {
            //     return new Promise((resolve) => {
            //         try {
            //             const connection = new Connection(clusterApiUrl("devnet"),"confirmed");
            //             const tokenAccounts = connection.getTokenAccountsByOwner(
            //                 // new PublicKey("Begfxys71yZxL6e1VzzSuCxeH2wEaoLZVtdwNKHqr75R"),
            //                     publicKey,
            //                 {
            //                     programId: TOKEN_PROGRAM_ID,
            //                 }
            //               );
            //             resolve(tokenAccounts)
            //         } catch(err) {
            //             console.log(err);
            //         }
            //     });
            // }
            // getKtaTokenAccount().then((tokenAccounts: RpcResponseAndContext<{
            //     pubkey: PublicKey;
            //     account: AccountInfo<Buffer>;
            // }[]>) => {
            //     console.log("Token Balance");
            //     console.log("------------------------------------------------------------");
            //     tokenAccounts.value.forEach((e) => {
            //         // console.log(e.pubkey.toBase58);
            //         const accountInfo = AccountLayout.decode(e.account.data);
            //         // console.log(accountInfo.amount);
            //         console.log(`${new PublicKey(accountInfo.mint)}   ${accountInfo.amount}`);
            //     })
            //   });

        });
        provider?.on("disconnect", ()=>{ 
            console.log("disconnect event");
            setConnected(false); 
            setPubKey(null);
        });

    }, [provider]);


    const connectHandler: React.MouseEventHandler<HTMLButtonElement> = (event) => {
        console.log(`connect handler`);
        provider?.connect()
        .catch((err) => { console.error("connect ERROR:", err); });
    }

    const disconnectHandler: React.MouseEventHandler<HTMLButtonElement> = (event) => {
        console.log("disconnect handler");
        provider?.disconnect()
        .catch((err) => {console.error("disconnect ERROR:", err); });
    }

    return (
        <div>
            { walletAvail ?
                <>
                <button disabled={connected} onClick={connectHandler}>Connect to Phantom</button>
                <button disabled={!connected} onClick={disconnectHandler}>Disconnect from Phantom</button>
                { connected ? <p>Your public key is : {pubKey?.toBase58()} </p> : null }
                { connected ? <p>Your sol Balance is : {solBalance}</p> : null }
                </>
            :
                <>
                <p>Opps!!! Phantom is not available. Go get it <a href="https://phantom.app/">https://phantom.app/</a>.</p>
                </>
            }
        </div>
    );
}

export default Connect2Phantom;
