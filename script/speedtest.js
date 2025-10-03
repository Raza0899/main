document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');

    // -------------------
    // CONFIG (Multiple Servers)
    // -------------------
    const TEST_FILES = [
        // Your AWS S3 bucket
        "https://speedtest089.s3.eu-north-1.amazonaws.com/20mb.pdf",
        // Your own server
        "https://wuumart.xyz/images/20mb.pdf",
        // AWS CloudFront (US)
        "https://d38z8pnnvn2m2r.cloudfront.net/20MB.test",
        // DigitalOcean (NYC)
        "https://speedtest-nyc1.digitalocean.com/20mb.test",
        // Hetzner (Germany)
        "https://speed.hetzner.de/20MB.bin",
        // OVH (France)
        "https://proof.ovh.net/files/20Mb.dat",
        // Tele2 (Sweden)
        "https://speedtest.tele2.net/20MB.zip"
    ];

    const TEST_DURATION = 15; // seconds per test
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

    const displayResults = (download) => {
        main.innerHTML = `
            <h2>Internet Speed Test Results</h2>
            <div class="results-container">
                <div class="result-box">
                    <h3>Download Speed</h3>
                    <p class="speed-value">${download} <span class="unit">Mbps</span></p>
                </div>
            </div>
            <button>Re-test</button>
        `;
        document.querySelector('main button').addEventListener('click', startTest);
    };

    // -------------------
    // SINGLE SERVER DOWNLOAD TEST
    // -------------------
    const runSingleDownload = (url, duration) => new Promise((resolve) => {
        const speeds = [];
        const startTime = performance.now();
        let bytes = 0;

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url + "?nocache=" + Date.now(), true);
        xhr.responseType = "arraybuffer";

        xhr.onprogress = (e) => {
            if (e.loaded > 0) bytes = e.loaded;
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > 0) {
                const mbps = (bytes * 8 / elapsed) / (1024 * 1024);
                const rounded = mbps.toFixed(2);
                speeds.push(parseFloat(rounded));
                if (speedDisplay) {
                    speedDisplay.innerHTML = `${rounded} <span class="unit">Mbps</span>`;
                }
            }
        };

        xhr.onloadend = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const finalMbps = (bytes * 8 / elapsed) / (1024 * 1024);
            speeds.push(finalMbps);
            resolve(speeds);
        };

        setTimeout(() => {
            xhr.abort();
            const elapsed = (performance.now() - startTime) / 1000;
            const finalMbps = (bytes * 8 / elapsed) / (1024 * 1024);
            speeds.push(finalMbps);
            resolve(speeds);
        }, duration * 1000);

        xhr.send();
    });

    // -------------------
    // SEQUENTIAL TESTING
    // -------------------
    const runSequentialDownload = async (urls, duration) => {
        let allSpeeds = [];
        for (let i = 0; i < urls.length; i++) {
            if (speedDisplay) {
                speedDisplay.innerHTML = `Testing server ${i+1}/${urls.length}...`;
            }
            const speeds = await runSingleDownload(urls[i], duration);
            allSpeeds = allSpeeds.concat(speeds);
        }
        return allSpeeds;
    };

    // -------------------
    // ACCURACY BOOST: MEDIAN SPEED
    // -------------------
    const calculateStableSpeed = (arr) => {
        if (arr.length === 0) return "0.00";
        arr.sort((a, b) => a - b);
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 
            ? arr[mid].toFixed(2) 
            : ((arr[mid - 1] + arr[mid]) / 2).toFixed(2);
    };

    // -------------------
    // START TEST
    // -------------------
    const startTest = async () => {
        updateUI(`Testing Download Speed from ${TEST_FILES.length} servers...`);

        const allSpeeds = await runSequentialDownload(TEST_FILES, TEST_DURATION);
        const finalSpeed = calculateStableSpeed(allSpeeds);

        displayResults(finalSpeed);
    };

    // -------------------
    // INIT
    // -------------------
    if (document.querySelector('main button')) {
        document.querySelector('main button').addEventListener('click', startTest);
    }

    // -------------------
    // DATE & TIME DISPLAY
    // -------------------
    function updateDateTime() {
        const now = new Date();
        const datetimeEl = document.getElementById("datetime");
        if (datetimeEl) datetimeEl.innerText = now.toLocaleString();
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
});
