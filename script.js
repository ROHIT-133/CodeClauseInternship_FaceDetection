// Global Variables
let videoStream = null;
let canvas = null;
let resizedDetections = null;
let showLandmarks = true;
let lastDetections = [];

// DOM Elements
const video = document.getElementById('video');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resultsList = document.getElementById('results-list');
const loadingAnimation = document.querySelector('.loading-animation');
const toggleLandmarksButton = document.getElementById('toggle-landmarks');
const feedbackForm = document.getElementById('feedback-form');

/**
 * Starts the video stream and loads face-api models.
 */
async function startVideo() {
    try {
        console.log('Starting video...');
        loadingAnimation.style.display = 'block';

        // Load Face-API Models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/face-api models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/face-api models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/face-api models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/face-api models')
        ]);
        console.log('Loaded face detection models...');

        // Get User Media
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;
        video.play();
        console.log('Video stream started.');

        startButton.disabled = true;
        stopButton.disabled = false;
    } catch (err) {
        console.error('Error in startVideo:', err);
        alert('Error accessing the webcam. Please ensure it is connected and you have granted permission.');
    } finally {
        loadingAnimation.style.display = 'none';
    }
}

/**
 * Stops the video stream.
 */
function stopVideo() {
    console.log('Stopping video...');
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        console.log('Video stream stopped.');
    }
    video.srcObject = null;
    startButton.disabled = false;
    stopButton.disabled = true;

}

/**
 * Handles video play event to start face detection.
 */
video.addEventListener('play', () => {
    console.log('Video is playing.');

    // Check if video metadata is loaded
    if (video.readyState < 3) { // HAVE_FUTURE_DATA
        console.log('Video metadata not loaded yet. Waiting for "loadedmetadata" event.');
        video.addEventListener('loadedmetadata', initializeCanvasAndFaceDetection, { once: true });
    } else {
        initializeCanvasAndFaceDetection();
    }

    // Clear Canvas
    if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        console.log('Canvas cleared.');
    }

    // Clear Results List
    resultsList.innerHTML = '';
    console.log('Results list cleared.');


});

/**
 * Initializes the canvas and starts face detection.
 */
function initializeCanvasAndFaceDetection() {
    console.log('Initializing canvas and starting face detection.');

    // Create and append canvas
    canvas = faceapi.createCanvasFromMedia(video);
    const videoContainer = document.querySelector('.video-container');
    videoContainer.appendChild(canvas);
    console.log('Canvas appended to video-container.');

    // Style canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1'; // Ensure canvas is above video
    // canvas.style.border = '2px solid red'; // Uncomment for debugging

    // Set display size based on video dimensions
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    console.log('Canvas dimensions matched to video:', displaySize);

    // Start Face Detection Interval
    const detectionInterval = setInterval(async () => {
        if (video.paused || video.ended) {
            console.log('Video paused or ended. Clearing detection interval.');
            clearInterval(detectionInterval);
            return;
        }

        try {
            // Detect Faces
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            // Resize Detections
            resizedDetections = faceapi.resizeResults(detections, displaySize);
            console.log('Detections:', resizedDetections);

            // Clear Canvas
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // Draw Detections
            faceapi.draw.drawDetections(canvas, resizedDetections);
            if (showLandmarks) {
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            }
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
            console.log('Drawn detections on canvas.');

            // Update Results List
            updateResultsList(detections);
        } catch (err) {
            console.error('Error during face detection:', err);
        }
    }, 100); // Runs every 200ms

    // Handle Window Resize
    window.addEventListener('resize', () => {
        const newDisplaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, newDisplaySize);
        console.log('Canvas resized:', newDisplaySize);
    });
}

/**
 * Updates the face detection results list.
 * @param {Array} detections - Array of detected face objects.
 */
function updateResultsList(detections) {
    resultsList.innerHTML = '';
    detections.forEach((detection, index) => {
        const resultItem = document.createElement('li');
        const expressions = detection.expressions;
        // Find the expression with the highest probability
        const sortedExpressions = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
        const dominantExpression = sortedExpressions[0][0];
        resultItem.textContent = `Face ${index + 1}: ${dominantExpression} (${(sortedExpressions[0][1] * 100).toFixed(2)}%)`;
        resultsList.appendChild(resultItem);
    });
    console.log('Results list updated.');
}

/**
 * Toggles the display of facial landmarks.
 */
toggleLandmarksButton.addEventListener('click', () => {
    showLandmarks = !showLandmarks;
    toggleLandmarksButton.textContent = showLandmarks ? 'Hide Landmarks' : 'Show Landmarks';
    console.log(`Show Landmarks set to: ${showLandmarks}`);
});

/**
 * Handles the Start button click.
 */
startButton.addEventListener('click', () => {
    startVideo();
});

/**
 * Handles the Stop button click.
 */
stopButton.addEventListener('click', () => {
    stopVideo();
});

/**
 * Handles feedback form submission.
 */

// New event listener for the feedback form submission
document.getElementById('submit-feedback').addEventListener('click', function() {
    const selectedStar = document.querySelector('input[name="star"]:checked');
    const feedbackText = document.getElementById('feedback-text').value;

    if (selectedStar) {
        const rating = selectedStar.id.replace('star', ''); // Get the star rating
        alert(`Thank you for your feedback! You rated: ${rating} stars. \nYour comments: ${feedbackText}`);
        
        // You can send the rating and feedback to your server here
    } else {
        alert('Please select a star rating.');
    }

    // Clear the form
    document.querySelectorAll('input[name="star"]').forEach(input => input.checked = false);
    document.getElementById('feedback-text').value = '';
    document.getElementById('feedback-form').style.display = 'none'; // Hide the form after submission
});

// Call this function when you stop the video to show the feedback form
function stopVideo() {
    videoStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    startButton.disabled = false;
    stopButton.disabled = true;

    // Display the feedback form
    document.getElementById('feedback-form').style.display = 'flex';
}

