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

connectWalletButton.addEventListener("click", async () => {
    try {
        status.textContent = "Connecting...";
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        console.log("Connected address:", userAddress);

        connectWalletButton.classList.add("hidden");
        connectedAddress.textContent = truncateAddress(userAddress);
        connectedAddress.classList.remove("hidden");

        const isActive = await contract.isVotingActive();
        const hasVoted = await contract.hasVoted(userAddress);
        console.log("Voting active:", isActive, "Has voted:", hasVoted);

        if (hasVoted) {
            status.textContent = "You've already voted, click 'Check' to see your vote";
            votedSection.classList.remove("hidden");
            votingSection.classList.add("hidden");
        } else if (isActive) {
            status.textContent = "";
            votingSection.classList.remove("hidden");
            votedSection.classList.add("hidden");
        } else {
            status.textContent = "Voting has ended!";
            votingSection.classList.add("hidden");
            votedSection.classList.add("hidden");
        }
    } catch (error) {
        console.error("Connect error:", error);
        status.textContent = `Error: ${error.message}`;
    }
});

connectedAddress.addEventListener("click", () => {
    disconnectOption.classList.toggle("hidden");
});

disconnectOption.addEventListener("click", () => {
    connectWalletButton.classList.remove("hidden");
    connectedAddress.classList.add("hidden");
    disconnectOption.classList.add("hidden");
    votingSection.classList.add("hidden");
    votedSection.classList.add("hidden");
    status.textContent = "";
});

document.getElementById("voteA").addEventListener("click", () => castVote("0x01", "Candidate A"));
document.getElementById("voteB").addEventListener("click", () => castVote("0x00", "Candidate B"));

async function castVote(voteData, candidateName) {
    try {
        status.textContent = `Submitting vote for ${candidateName}...`;
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.castVote(voteData);
        status.textContent = `Transaction sent: ${truncateTx(tx.hash)}`;
        await tx.wait();
        status.textContent = "Congrats! Your vote has been casted";
        votingSection.classList.add("hidden");
        votedSection.classList.remove("hidden");
    } catch (error) {
        console.error("Vote error:", error);
        status.textContent = `Error: ${error.message}`;
    }
}

checkVoteButton.addEventListener("click", async () => {
    if (checkVoteButton.textContent === "Check") {
        try {
            status.textContent = "Fetching your vote...";
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();
            const voteData = await contract.getVote(userAddress); // Requires getVote
            const voteHex = ethers.utils.hexlify(voteData);
            const candidate = voteHex === "0x01" ? "Candidate A" : "Candidate B";
            voteDisplay.textContent = `You voted for ${candidate}`;
            voteDisplay.classList.remove("hidden");
            checkVoteButton.textContent = "Hide Vote";
            status.textContent = "";
        } catch (error) {
            console.error("Check vote error:", error);
            status.textContent = `Error: ${error.message}`;
        }
    } else {
        voteDisplay.classList.add("hidden");
        checkVoteButton.textContent = "Check";
    }
});

function truncateAddress(addr) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function truncateTx(tx) {
    return `${tx.slice(0, 6)}...${tx.slice(-4)}`;
}
