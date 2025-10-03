document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');

    // -------------------
    // CONFIG (Multiple Servers)
    // -------------------
    const TEST_FILES = [
        "https://speedtest089.s3.eu-north-1.amazonaws.com/20mb.pdf", // AWS
        "https://wuumart.xyz/images/20mb.pdf",                      // Your server
        "https://d38z8pnnvn2m2r.cloudfront.net/20MB.test",          // CloudFront
        "https://speedtest-nyc1.digitalocean.com/20mb.test",        // DigitalOcean
        "https://speed.hetzner.de/20MB.bin",                        // Hetzner
        "https://proof.ovh.net/files/20Mb.dat",                     // OVH
        "https://speedtest.tele2.net/20MB.zip"                      // Tele2
    ];

    const TEST_DURATION = 15; // seconds
    let speedDisplay = null;

    // -------------------
    // UI
    // -------------------
    const updateUI = (status) => {
        main.innerHTML = `
            <h2>Speed Test in Progress...</h2>
            <p>${status}</p>
            <div class="live-speed-display">
                <p id="live-speed-value">0.00 <span class="unit">Mbps</span></p>
            </div>
            <div id="spinner" class="loader"></div>
            <button disabled>Testing...</button>
        `;
        speedDisplay = document.getElementById('live-speed-value');
    };

    const displayResults = (download, ip, ping, dateTime) => {
        main.innerHTML = `
            <h2>Internet Speed Test Results</h2>
            <div class="results-container">
                <div class="result-box">
                    <h3>Download Speed</h3>
                    <p class="speed-value">${download} <span class="unit">Mbps</span></p>
                </div>
                <div class="result-box">
                    <h3>Ping</h3>
                    <p class="speed-value">${ping} <span class="unit">ms</span></p>
                </div>
                <div class="result-box">
                    <h3>IP Address</h3>
                    <p class="speed-value">${ip}</p>
                </div>
                <div class="result-box">
                    <h3>Tested At</h3>
                    <p class="speed-value">${dateTime}</p>
                </div>
            </div>
            <button>Re-test</button>
        `;
        document.querySelector('main button').addEventListener('click', startTest);
    };

    // -------------------
    // PARALLEL DOWNLOAD TEST
    // -------------------
    const runParallelDownload = (urls, duration) => new Promise((resolve) => {
        const speeds = [];
        const startTime = performance.now();
        const bytesLoaded = new Array(urls.length).fill(0);

        const xhrs = urls.map((url, idx) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url + "?nocache=" + Date.now(), true);
            xhr.responseType = "arraybuffer";

            xhr.onprogress = (e) => {
                if (e.loaded > 0) {
                    bytesLoaded[idx] = e.loaded;
                }
                const elapsed = (performance.now() - startTime) / 1000;
                if (elapsed > 0) {
                    const combined = bytesLoaded.reduce((a, b) => a + b, 0);
                    let mbps = (combined * 8 / elapsed) / (1024 * 1024);

                    const rounded = mbps.toFixed(2);
                    speeds.push(parseFloat(rounded));
                    if (speedDisplay) {
                        speedDisplay.innerHTML = `${rounded} <span class="unit">Mbps</span>`;
                    }
                }
            };

            xhr.send();
            return xhr;
        });

        const finish = () => {
            xhrs.forEach(x => x.abort());
            resolve(speeds);
        };

        setTimeout(finish, duration * 1000);
    });

    // -------------------
    // MEDIAN SPEED
    // -------------------
    const calculateStableSpeed = (arr) => {
        if (arr.length === 0) return "0.00";
        arr.sort((a, b) => a - b);
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 ? arr[mid].toFixed(2) : ((arr[mid - 1] + arr[mid]) / 2).toFixed(2);
    };

    // -------------------
    // GET PUBLIC IP
    // -------------------
    const getIP = async () => {
        try {
            const res = await fetch("https://api64.ipify.org?format=json");
            const data = await res.json();
            return data.ip;
        } catch {
            return "Unavailable";
        }
    };

    // -------------------
    // PING TEST
    // -------------------
    const pingTest = async (url = "https://1.1.1.1/cdn-cgi/trace", count = 5) => {
        let times = [];
        for (let i = 0; i < count; i++) {
            const start = performance.now();
            try {
                await fetch(url + "?cache=" + Date.now(), { mode: "no-cors" });
                const end = performance.now();
                times.push(end - start);
            } catch {
                times.push(999);
            }
        }
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        return Math.round(avg);
    };

    // -------------------
    // START TEST
    // -------------------
    const startTest = async () => {
        updateUI(`Testing Download Speed from ${TEST_FILES.length} servers...`);

        const [allSpeeds, ip, ping] = await Promise.all([
            runParallelDownload(TEST_FILES, TEST_DURATION),
            getIP(),
            pingTest()
        ]);

        const finalSpeed = calculateStableSpeed(allSpeeds);

        // get local date + time
        const now = new Date();
        const dateTime = now.toLocaleString();

        displayResults(finalSpeed, ip, ping, dateTime);
    };

    // -------------------
    // INIT
    // -------------------
    if (document.querySelector('main button')) {
        document.querySelector('main button').addEventListener('click', startTest);
    }
});

// -------------------
// DATE & TIME DISPLAY
// -------------------
function updateDateTime() {
    const now = new Date();
    document.getElementById("datetime").innerText = now.toLocaleString();
}
setInterval(updateDateTime, 1000);
updateDateTime();
