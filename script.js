// --- DOM Elements ---
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const cameraTabBtn = document.getElementById('cameraTabBtn');
const uploadTabBtn = document.getElementById('uploadTabBtn');
const cameraTab = document.getElementById('cameraTab');
const uploadTab = document.getElementById('uploadTab');
const loadingDiv = document.getElementById('loading');
const resultContainer = document.getElementById('resultContainer');

let model = null;
let stream = null;

// --- Tab Switching ---
cameraTabBtn.addEventListener('click', () => {
    cameraTab.style.display = 'block';
    uploadTab.style.display = 'none';
    cameraTabBtn.classList.add('active');
    uploadTabBtn.classList.remove('active');
    startCamera();
});

uploadTabBtn.addEventListener('click', () => {
    cameraTab.style.display = 'none';
    uploadTab.style.display = 'block';
    uploadTabBtn.classList.add('active');
    cameraTabBtn.classList.remove('active');
    stopCamera();
});

// --- Camera Functions with Better Error Handling ---
async function startCamera() {
    try {
        if (stream) {
            // Camera is already running
            return;
        }
        
        console.log("Starting camera...");
        
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser doesn't support camera access. Please use the upload feature or update your browser.");
            return;
        }
        
        // Request camera with constraints
        const constraints = {
            video: {
                facingMode: "environment",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Wait for video to be ready
        await video.play();
        console.log("Camera started successfully!");
        
    } catch (err) {
        console.error("Camera error:", err);
        
        // User-friendly error messages
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert("Camera access was denied. Please allow camera access in your browser settings and reload the page. Or use the upload feature.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert("No camera found on your device. Please use the upload feature instead.");
        } else {
            alert(`Camera error: ${err.message}\nPlease use the upload feature.`);
        }
        
        // Show upload tab as fallback
        uploadTabBtn.click();
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        stream = null;
        video.srcObject = null;
        console.log("Camera stopped");
    }
}

// --- Capture from Camera ---
captureBtn.addEventListener('click', () => {
    if (!stream || !video.videoWidth) {
        alert("Camera is not ready. Please wait or refresh the page.");
        return;
    }
    
    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        runPrediction(imageDataUrl);
    } catch (err) {
        console.error("Capture error:", err);
        alert("Failed to capture image. Please try again.");
    }
});

// --- File Upload with Better Handling ---
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected");
        return;
    }
    
    console.log("File selected:", file.name, "Size:", file.size);
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file (JPEG, PNG, etc.)");
        fileInput.value = '';
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 5MB.");
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imageDataUrl = e.target.result;
            imagePreview.innerHTML = `<img src="${imageDataUrl}" alt="Uploaded Image" style="max-width: 100%;">`;
            runPrediction(imageDataUrl);
        } catch (err) {
            console.error("File read error:", err);
            alert("Failed to read the image file. Please try again.");
        }
    };
    reader.onerror = (err) => {
        console.error("FileReader error:", err);
        alert("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(file);
});

// --- Model Loading ---
async function loadModel() {
    if (model) return model;
    try {
        console.log("Loading model...");
        // Using MobileNet (for now)
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        console.log("Model loaded successfully!");
        return model;
    } catch (error) {
        console.error("Error loading model:", error);
        alert("Failed to load the AI model. Please check your internet connection.");
        return null;
    }
}

// --- Prediction Function ---
async function runPrediction(imageDataUrl) {
    // Show loading state
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    // Create an image element
    const img = new Image();
    img.src = imageDataUrl;
    
    img.onload = async function() {
        try {
            // Load model
            const model = await loadModel();
            if (!model) {
                loadingDiv.style.display = 'none';
                return;
            }

            // Preprocess image
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .expandDims();

            // Get predictions
            const predictions = await model.predict(tensor);
            const data = await predictions.data();
            
            // Find top prediction
            let maxConfidence = 0;
            let maxIndex = 0;
            for (let i = 0; i < data.length; i++) {
                if (data[i] > maxConfidence) {
                    maxConfidence = data[i];
                    maxIndex = i;
                }
            }

            // Plant disease class names (PlantVillage dataset)
            const classNames = [
                'Apple Scab', 'Apple Black Rot', 'Apple Cedar Rust', 'Apple Healthy',
                'Corn Cercospora', 'Corn Common Rust', 'Corn Northern Leaf Blight', 'Corn Healthy',
                'Potato Early Blight', 'Potato Late Blight', 'Potato Healthy',
                'Tomato Bacterial Spot', 'Tomato Early Blight', 'Tomato Late Blight',
                'Tomato Leaf Mold', 'Tomato Septoria Leaf Spot', 'Tomato Spider Mites',
                'Tomato Target Spot', 'Tomato Yellow Leaf Curl', 'Tomato Mosaic Virus', 'Tomato Healthy'
            ];
            
            const topClass = classNames[maxIndex] || 'Unknown';
            const confidence = Math.round(maxConfidence * 100);
            const isHealthy = topClass.toLowerCase().includes('healthy');
            
            displayResult({
                disease: topClass,
                confidence: confidence,
                isHealthy: isHealthy
            });
            
        } catch (error) {
            console.error("Prediction error:", error);
            resultContainer.innerHTML = `
                <div class="error">
                    <strong>❌ Prediction Error</strong>
                    <p>${error.message || 'Something went wrong. Please try again.'}</p>
                </div>
            `;
        } finally {
            loadingDiv.style.display = 'none';
        }
    };
    
    img.onerror = function() {
        loadingDiv.style.display = 'none';
        alert("Failed to load the image. Please try again.");
    };
}

// --- Display Result ---
function displayResult(result) {
    const cardClass = result.isHealthy ? 'result-card' : 'result-card affected';
    const statusText = result.isHealthy ? '🌿 Healthy' : '⚠️ Affected';
    const icon = result.isHealthy ? '🌿' : '⚠️';
    const statusClass = result.isHealthy ? 'healthy' : 'affected';
    
    let confidenceWarning = '';
    if (result.confidence < 50) {
        confidenceWarning = `
            <div class="advice" style="background: #fff3e0;">
                <strong>⚠️ Low Confidence Warning</strong>
                <p>This prediction has low confidence (${result.confidence}%). 
                Try taking a clearer photo with better lighting.</p>
                <p><small>Note: The current model is a general-purpose model. For accurate 
                plant disease detection, a specialized model is needed.</small></p>
            </div>
        `;
    }
    
    let recommendation = '';
    if (!result.isHealthy && result.confidence >= 50) {
        recommendation = `
            <div class="advice">
                <strong>💡 Recommendation:</strong> 
                <p>Consult with an agricultural expert. Consider using appropriate organic pesticides or fungicides.</p>
            </div>
        `;
    } else if (result.isHealthy && result.confidence >= 50) {
        recommendation = `
            <div class="advice" style="background: #e8f5e9; border-left-color: #2e7d32;">
                <strong>✅ Plant appears healthy!</strong>
                <p>Continue regular monitoring and care. Your plant looks good! 🌱</p>
            </div>
        `;
    }
    
    resultContainer.innerHTML = `
        <div class="${cardClass}">
            <span class="status-icon">${icon}</span>
            <h3>Analysis Result</h3>
            <p class="status ${statusClass}">${statusText}</p>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${result.confidence}%;"></div>
            </div>
            <p><strong>Confidence:</strong> ${result.confidence}%</p>
            <p><strong>Detected Condition:</strong> ${result.disease}</p>
            ${confidenceWarning}
            ${recommendation}
        </div>
    `;
}

// --- Initialize ---
console.log("🌱 Plant Disease Detector starting...");

// Load model in background
loadModel();

// Start with camera tab active
cameraTabBtn.classList.add('active');
startCamera();
