const contractAddress = "0x2F736650ef8c2f305BFd3dd74EF8EC57284C6b38"; 
const contractABI = [
    "function createSession(uint256 _startTime, uint256 _duration) external",
    "function castVote(uint256 _sessionId, bool _voteForAlice) external",
    "function getSession(uint256 _sessionId) view returns (uint256, uint256, uint256, uint256, bool)",
    "function hasVotedInSession(uint256 _sessionId, address _voter) view returns (bool)",
    "function sessionCount() view returns (uint256)",
    "function admin() view returns (address)"
];

const SEISMIC_DEVNET = {
    chainId: "0x1404",
    chainName: "Seismic Devnet",
    nativeCurrency: { name: "Seismic Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://node-2.seismicdev.net/rpc"],
    blockExplorerUrls: ["https://explorer-2.seismicdev.net"]
};

let provider = new ethers.providers.Web3Provider(window.ethereum);
let contract = new ethers.Contract(contractAddress, contractABI, provider);

const status = document.getElementById("status");
const connectWalletButton = document.getElementById("connectWallet");
const connectedAddress = document.getElementById("connectedAddress");
const newPollButton = document.getElementById("newPoll");
const ongoingPolls = document.getElementById("ongoingPolls");
const archivedPolls = document.getElementById("archivedPolls");

async function ensureSeismicDevnet() {
    const network = await provider.getNetwork();
    if (network.chainId !== 5124) {
        try {
            await provider.send("wallet_switchEthereumChain", [{ chainId: SEISMIC_DEVNET.chainId }]);
        } catch (switchError) {
            if (switchError.code === 4902) {
                await provider.send("wallet_addEthereumChain", [SEISMIC_DEVNET]);
            } else {
                throw switchError;
            }
        }
        provider = new ethers.providers.Web3Provider(window.ethereum);
        contract = new ethers.Contract(contractAddress, contractABI, provider);
    }
}

async function updatePolls() {
    await ensureSeismicDevnet();
    const sessionCount = await contract.sessionCount();
    const now = Math.floor(Date.now() / 1000);
    ongoingPolls.innerHTML = "";
    archivedPolls.innerHTML = "";

    for (let i = 0; i < sessionCount; i++) {
        const [startTime, endTime, aliceVotes, bobVotes, isEnded] = await contract.getSession(i);
        const sessionCard = document.createElement("div");
        sessionCard.className = "vote-card";
        sessionCard.innerHTML = `
            <p>Poll #${i}</p>
            <p>Start: ${new Date(startTime * 1000).toLocaleString()}</p>
            <p>End: ${new Date(endTime * 1000).toLocaleString()}</p>
            <p>Alice: ${aliceVotes} | Bob: ${bobVotes}</p>
        `;

        if (!isEnded && now >= startTime) {
            const hasVoted = await contract.hasVotedInSession(i, (await provider.getSigner().getAddress()));
            if (!hasVoted) {
                sessionCard.innerHTML += `
                    <button onclick="castVote(${i}, true)">Vote Alice</button>
                    <button onclick="castVote(${i}, false)">Vote Bob</button>
                `;
            }
            sessionCard.innerHTML += `<p>Time remaining: ${formatTime(endTime - now)}</p>`;
            ongoingPolls.appendChild(sessionCard);
        } else {
            sessionCard.innerHTML += `<p>Ended: ${formatTime(now - endTime)} ago</p>`;
            archivedPolls.appendChild(sessionCard);
        }
    }
}

connectWalletButton.addEventListener("click", async () => {
    try {
        status.textContent = "Connecting...";
        await provider.send("eth_requestAccounts", []);
        await ensureSeismicDevnet();
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        connectWalletButton.classList.add("hidden");
        connectedAddress.textContent = truncateAddress(userAddress);
        connectedAddress.classList.remove("hidden");
        const admin = await contract.admin();
        if (userAddress.toLowerCase() === admin.toLowerCase()) {
            newPollButton.classList.remove("hidden");
        }
        status.textContent = "";
        updatePolls();
    } catch (error) {
        console.error("Connect error:", error);
        status.textContent = `Error: ${error.message}`;
    }
});

newPollButton.addEventListener("click", async () => {
    try {
        const startTime = Math.floor(Date.now() / 1000);
        const duration = 604800; // 7 days
        status.textContent = "Creating new poll...";
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.createSession(startTime, duration);
        await tx.wait();
        status.textContent = "Poll created!";
        updatePolls();
    } catch (error) {
        status.textContent = `Error: ${error.message}`;
    }
});

async function castVote(sessionId, voteForAlice) {
    try {
        status.textContent = `Voting for ${voteForAlice ? "Alice" : "Bob"}...`;
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.castVote(sessionId, voteForAlice);
        await tx.wait();
        status.textContent = "Vote cast!";
        updatePolls();
    } catch (error) {
        status.textContent = `Error: ${error.message}`;
    }
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}

function truncateAddress(addr) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

setInterval(updatePolls, 60000); // Update every minute
updatePolls(); // Initial load
