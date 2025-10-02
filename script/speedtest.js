document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('main');
    const INITIAL_P = "Best place to check your internet Speed";

    // --- Configuration Updated with User's URL ---
    const DOWNLOAD_FILE_URL = 'https://wuumart.xyz/images/20mb.pdf';
    const DOWNLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB in bytes
    const UPLOAD_TEST_DURATION_SECONDS = 10;
    // ---------------------------------------------
    
    // Global variable to store the current status display element
    let speedDisplayElement = null;

    // Set up the initial content and event listener
    function setupInitialState() {
        mainContent.innerHTML = `
            <p>${INITIAL_P}</p>
            <button>Check</button>
        `;
        document.querySelector('main button').addEventListener('click', startTestSequence);
    }

    // Start the whole sequence (Latency -> Download -> Upload)
    async function startTestSequence() {
        // Step 1: UI preparation
        updateUI('Preparing Test...', true);

        try {
            // Step 2: Latency (Ping) Test
            const latency = await testLatency();

            // Step 3: Download Test
            updateUI('Testing Download Speed...', true, 'Download');
            const downloadMbps = await testDownload(DOWNLOAD_FILE_URL, DOWNLOAD_FILE_SIZE_BYTES);

            // Step 4: Upload Test
            updateUI('Testing Upload Speed...', true, 'Upload');
            const uploadMbps = await testUpload();

            // Step 5: Display Results
            displayResults(downloadMbps, uploadMbps, latency);

        } catch (error) {
            updateUI(`Error: ${error.message}. Please check console.`, false);
            console.error("Speed Test Error:", error);
            const button = document.querySelector('main button');
            if (button) {
                button.textContent = 'Re-test';
                button.disabled = false;
            }
        }
    }

    // ----------------------------------------------------
    //                 TEST FUNCTIONS
    // ----------------------------------------------------

    // Latency test remains the same
    function testLatency() {
        // ... (Latency code as before) ...
        return new Promise(resolve => {
            const numPings = 5;
            let totalTime = 0;
            let completedPings = 0;

            const ping = () => {
                const startTime = performance.now();
                fetch(DOWNLOAD_FILE_URL.substring(0, DOWNLOAD_FILE_URL.lastIndexOf('/')) + '/ping.txt' + '?t=' + Date.now(), { cache: 'no-store' })
                    .then(() => {
                        const endTime = performance.now();
                        totalTime += (endTime - startTime);
                        completedPings++;

                        if (completedPings < numPings) {
                            ping();
                        } else {
                            resolve(Math.round(totalTime / numPings));
                        }
                    })
                    .catch(() => {
                        resolve(999);
                    });
            };
            ping();
        });
    }

    /** Measures Download Speed with live updates. */
    function testDownload(url, size) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            const startTime = performance.now();
            
            xhr.onprogress = (event) => {
                 if (event.lengthComputable) {
                     const durationSeconds = (performance.now() - startTime) / 1000;
                     const loadedBytes = event.loaded; 
                     
                     // Calculate current speed in Mbps
                     const bits = loadedBytes * 8;
                     const mbps = (bits / durationSeconds) / 1024 / 1024;
                     
                     // Update the live speed display
                     if (speedDisplayElement) {
                         speedDisplayElement.innerHTML = `${mbps.toFixed(2)} <span class="unit">Mbps</span>`;
                     }
                 }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const durationSeconds = (performance.now() - startTime) / 1000;
                    const loadedBytes = size;
                    const bits = loadedBytes * 8;
                    const mbps = (bits / durationSeconds) / 1024 / 1024;
                    resolve(mbps.toFixed(2));
                } else {
                    reject(new Error(`Download failed with status: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during download test.'));

            xhr.open('GET', url + '?t=' + Date.now(), true);
            xhr.send();
        });
    }

    /** Measures Upload Speed with live updates. */
    function testUpload() {
        return new Promise(resolve => {
            const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
            const dataChunk = new Uint8Array(CHUNK_SIZE);
            window.crypto.getRandomValues(dataChunk);

            let totalUploadedBytes = 0;
            const startTime = performance.now();
            let lastReportTime = startTime;

            const runUpload = () => {
                const xhr = new XMLHttpRequest();

                // Listen for progress during upload (optional, but helps with live feel)
                xhr.upload.onprogress = (event) => {
                    const currentTime = performance.now();
                    const durationSeconds = (currentTime - startTime) / 1000;
                    
                    // We can estimate the speed based on total transferred bytes
                    const currentTotalBytes = totalUploadedBytes + event.loaded;
                    const bits = currentTotalBytes * 8;
                    const mbps = (bits / durationSeconds) / 1024 / 1024;
                    
                     // Update the live speed display frequently
                     if (speedDisplayElement && (currentTime - lastReportTime) > 100) { // Update every 100ms
                          speedDisplayElement.innerHTML = `${mbps.toFixed(2)} <span class="unit">Mbps</span>`;
                          lastReportTime = currentTime;
                     }
                };

                xhr.onload = () => {
                    totalUploadedBytes += CHUNK_SIZE; // Count the chunk that just finished
                    const durationSeconds = (performance.now() - startTime) / 1000;
                    
                    if (durationSeconds < UPLOAD_TEST_DURATION_SECONDS) {
                        runUpload(); // Continue uploading
                    } else {
                        // Final calculation
                        const bits = totalUploadedBytes * 8;
                        const mbps = (bits / durationSeconds) / 1024 / 1024;
                        resolve(mbps.toFixed(2));
                    }
                };

                xhr.onerror = xhr.onabort = () => {
                    // Final calculation on error/abort
                    const bits = totalUploadedBytes * 8;
                    const mbps = (bits / (performance.now() - startTime) / 1000) / 1024 / 1024;
                    resolve(mbps.toFixed(2));
                };

                xhr.open('POST', window.location.href, true);
                xhr.send(dataChunk);
            };

            runUpload();
        });
    }

    // ----------------------------------------------------
    //                   UI FUNCTIONS
    // ----------------------------------------------------

    /** Updates the main content area with status, spinner, and live speed element. */
    function updateUI(statusText, showSpinner, testType = 'General') {
        mainContent.innerHTML = `
            <h2>${testType} Test in Progress...</h2>
            <p>${statusText}</p>
            <div class="live-speed-display">
                <p id="live-speed-value">0.00 <span class="unit">Mbps</span></p>
            </div>
            ${showSpinner ? '<div id="spinner" class="loader"></div>' : ''}
            <button disabled>Check</button>
        `;
        // Store reference to the live speed element
        speedDisplayElement = document.getElementById('live-speed-value');
    }

    /** Displays the final results. (Same as before) */
    function displayResults(download, upload, latency) {
        mainContent.innerHTML = `
            <h2>Internet Speed Test Results</h2>
            <div class="results-container">
                <div class="result-box">
                    <h3>Download Speed</h3>
                    <p class="speed-value">${download} <span class="unit">Mbps</span></p>
                </div>
                <div class="result-box">
                    <h3>Upload Speed</h3>
                    <p class="speed-value">${upload} <span class="unit">Mbps</span></p>
                </div>
                <div class="result-box">
                    <h3>Latency (Ping)</h3>
                    <p class="speed-value">${latency} <span class="unit">ms</span></p>
                </div>
            </div>
            <button>Re-test</button>
        `;
        document.querySelector('main button').addEventListener('click', startTestSequence);
        speedDisplayElement = null; // Clear the reference
    }

    // Initial call
    setupInitialState();
});
