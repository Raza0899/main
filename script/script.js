// A URL for a file of a known size (e.g., a large image or document).
// Note: This must be a file you can reliably access and whose size you know.
// Caching can affect results, so a URL with a cache-busting query is often better.
const TEST_FILE_URL = "https://cdn.pixabay.com/photo/2023/11/04/10/58/cat-8364024_1280.jpg";
const FILE_SIZE_BYTES = 1010328; // Actual size of the test file (e.g., 1.01 MB in bytes)

const startButton = document.getElementById('start-button');
const speedResult = document.getElementById('speed-result');
const statusMessage = document.getElementById('status-message');

startButton.addEventListener('click', startSpeedTest);

function startSpeedTest() {
    startButton.disabled = true;
    speedResult.textContent = 'Testing...';
    statusMessage.textContent = 'Downloading test file...';

    const startTime = performance.now(); // More accurate time measure

    // Fetch the test file
    fetch(TEST_FILE_URL + "?cache-buster=" + startTime) // Add a unique query to prevent caching
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob(); // Download the file content
        })
        .then(() => {
            const endTime = performance.now();
            const durationSeconds = (endTime - startTime) / 1000;

            // Calculation: Speed = (File Size in Bits) / Time in Seconds
            // 1 byte = 8 bits
            // 1 Mbps = 1,000,000 bits per second (using the common metric definition for speed tests)
            const loadedBits = FILE_SIZE_BYTES * 8;
            const speedMbps = (loadedBits / durationSeconds) / 1000000;

            // Display results
            speedResult.textContent = `${speedMbps.toFixed(2)} Mbps`;
            statusMessage.textContent = 'Test Complete!';
        })
        .catch(error => {
            speedResult.textContent = 'Error';
            statusMessage.textContent = `Test Failed: ${error.message}`;
            console.error("Speed test error:", error);
        })
        .finally(() => {
            startButton.disabled = false;
        });
}
