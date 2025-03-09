const contractAddress = "0x2a8E40e6857F3b0634edC4Cc9D105218Bdc04D4e"; 
const rpcUrl = "https://node-2.seismicdev.net/rpc"; 
const contractABI = [
    "function castVote(bytes memory _encryptedVote) external",
    "function isVotingActive() external view returns (bool)",
    "function hasVoted(address) view returns (bool)",
    "function getVote(address) external view returns (bytes memory)" 
];

const provider = new ethers.providers.Web3Provider(window.ethereum);
const contract = new ethers.Contract(contractAddress, contractABI, provider);

const status = document.getElementById("status");
const votingSection = document.getElementById("votingSection");
const votedSection = document.getElementById("votedSection");
const checkVoteButton = document.getElementById("checkVote");
const voteDisplay = document.getElementById("voteDisplay");
const connectWalletButton = document.getElementById("connectWallet");
const connectedAddress = document.getElementById("connectedAddress");
const disconnectOption = document.getElementById("disconnectOption");

document.getElementById("connectWallet").addEventListener("click", async () => {
    try {
        console.log("Connecting wallet...");
        console.log("Connect button:", connectWalletButton);
        console.log("Address span:", connectedAddress);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        console.log("Connected address:", userAddress);

        connectWalletButton.style.display = "none";
        console.log("Connect button hidden");
        connectedAddress.textContent = userAddress;
        connectedAddress.style.display = "inline";
        console.log("Address shown");

        const isActive = await contract.isVotingActive();
        console.log("Voting active:", isActive);
        const hasVoted = await contract.hasVoted(userAddress);
        console.log("Has voted:", hasVoted);

        if (hasVoted) {
            status.textContent = "You've already voted, click the 'Check' button to view who you voted for";
            votedSection.style.display = "block";
            votingSection.style.display = "none";
        } else if (isActive) {
            votingSection.style.display = "block";
            votedSection.style.display = "none";
        } else {
            status.textContent = "Voting has ended!";
            votingSection.style.display = "none";
            votedSection.style.display = "none";
        }
    } catch (error) {
        console.error("Connect error:", error);
        status.textContent = `Error: ${error.message}`;
    }
});

connectedAddress.addEventListener("click", () => {
    disconnectOption.style.display = disconnectOption.style.display === "none" ? "inline" : "none";
});

disconnectOption.addEventListener("click", () => {
    // Reset UI
    connectWalletButton.style.display = "inline";
    connectedAddress.style.display = "none";
    disconnectOption.style.display = "none";
    votingSection.style.display = "none";
    votedSection.style.display = "none";
    status.textContent = "";
});

document.getElementById("voteA").addEventListener("click", async () => {
    await castVote("0x01", "Donald Trump");
});

document.getElementById("voteB").addEventListener("click", async () => {
    await castVote("0x00", "Kamala Harris");
});

async function castVote(voteData, candidateName) {
    try {
        console.log(`Voting for ${candidateName} with data: ${voteData}`);
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.castVote(voteData);
        console.log("Tx sent:", tx.hash);
        status.textContent = `Voting for ${candidateName}... Tx: ${tx.hash}`;
        await tx.wait();
        console.log("Tx confirmed:", tx.hash);
        status.textContent = "Congrats! Your vote has been casted";
        votingSection.style.display = "none";
        votedSection.style.display = "block";
    } catch (error) {
        console.error("Vote error:", error);
        status.textContent = `Error: ${error.message}`;
    }
}

checkVoteButton.addEventListener("click", async () => {
    if (checkVoteButton.textContent === "Check") {
        try {
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();
            const voteData = await contract.getVote(userAddress); 
            const voteHex = ethers.utils.hexlify(voteData);
            const candidate = voteHex === "0x01" ? "Donald Trump" : "Kamala Harris";
            voteDisplay.textContent = `You voted for ${candidate}`;
            voteDisplay.style.display = "block";
            checkVoteButton.textContent = "Hide Vote";
        } catch (error) {
            console.error("Check vote error:", error);
            status.textContent = `Error: ${error.message}`;
        }
    } else {
        voteDisplay.style.display = "none";
        checkVoteButton.textContent = "Check";
    }
});
