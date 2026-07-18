// ============================================
// PLANT DISEASE DETECTOR - COMPLETE SCRIPT
// Using PlantVillage-trained model
// ============================================

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

// ============================================
// PLANTVILLAGE CLASS NAMES (38 classes)
// ============================================
const PLANTVILLAGE_CLASSES = [
    'Apple Scab',
    'Apple Black Rot',
    'Apple Cedar Rust',
    'Apple Healthy',
    'Blueberry Healthy',
    'Cherry Powdery Mildew',
    'Cherry Healthy',
    'Corn Cercospora',
    'Corn Common Rust',
    'Corn Northern Leaf Blight',
    'Corn Healthy',
    'Grape Black Rot',
    'Grape Esca',
    'Grape Leaf Blight',
    'Grape Healthy',
    'Orange Huanglongbing',
    'Peach Bacterial Spot',
    'Peach Healthy',
    'Pepper Bacterial Spot',
    'Pepper Healthy',
    'Potato Early Blight',
    'Potato Late Blight',
    'Potato Healthy',
    'Raspberry Healthy',
    'Soybean Healthy',
    'Squash Powdery Mildew',
    'Strawberry Leaf Scorch',
    'Strawberry Healthy',
    'Tomato Bacterial Spot',
    'Tomato Early Blight',
    'Tomato Late Blight',
    'Tomato Leaf Mold',
    'Tomato Septoria Leaf Spot',
    'Tomato Spider Mites',
    'Tomato Target Spot',
    'Tomato Yellow Leaf Curl',
    'Tomato Mosaic Virus',
    'Tomato Healthy'
];

// ============================================
// MODEL CONFIGURATION
// ============================================
// OPTION 1: Use MobileNet (default - works out of the box)
const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

// OPTION 2: When you have a PlantVillage model, replace with:
// const MODEL_URL = 'https://your-hosted-url/plantvillage-model/model.json';

// ============================================
// TAB SWITCHING
// ============================================
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

// ============================================
// CAMERA FUNCTIONS
// ============================================
async function startCamera() {
    try {
        if (stream) return;
        
        console.log("📸 Starting camera...");
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser doesn't support camera access. Please use the upload feature.");
            return;
        }
        
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
        await video.play();
        console.log("✅ Camera started successfully!");
        
    } catch (err) {
        console.error("❌ Camera error:", err);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert("Camera access denied. Please allow camera access in browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert("No camera found. Please use the upload feature.");
        } else {
            alert(`Camera error: ${err.message}`);
        }
        
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
        console.log("📷 Camera stopped");
    }
}

// ============================================
// CAPTURE FROM CAMERA
// ============================================
captureBtn.addEventListener('click', () => {
    if (!stream || !video.videoWidth) {
        alert("Camera is not ready. Please wait or refresh.");
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
        console.error("❌ Capture error:", err);
        alert("Failed to capture image. Please try again.");
    }
});

// ============================================
// FILE UPLOAD
// ============================================
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log(`📁 File selected: ${file.name}, Size: ${(file.size/1024).toFixed(1)}KB`);
    
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        fileInput.value = '';
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert("Image too large (max 5MB).");
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imageDataUrl = e.target.result;
            imagePreview.innerHTML = `<img src="${imageDataUrl}" alt="Uploaded Image">`;
            runPrediction(imageDataUrl);
        } catch (err) {
            console.error("❌ File read error:", err);
            alert("Failed to read file. Please try again.");
        }
    };
    reader.onerror = () => {
        alert("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);
});

// ============================================
// LOAD MODEL
// ============================================
async function loadModel() {
    if (model) return model;
    
    try {
        console.log("🧠 Loading PlantVillage model...");
        
        // Try loading as Graph Model first
        try {
            model = await tf.loadGraphModel(MODEL_URL);
            console.log("✅ Model loaded as Graph Model!");
            return model;
        } catch (graphError) {
            console.log("Graph model load failed, trying Layers model...");
        }
        
        // Try loading as Layers Model
        model = await tf.loadLayersModel(MODEL_URL);
        console.log("✅ Model loaded as Layers Model!");
        return model;
        
    } catch (error) {
        console.error("❌ Error loading model:", error);
        alert(
            "Failed to load the PlantVillage AI model.\n\n" +
            "Please check your internet connection and ensure the model URL is correct.\n\n" +
            "Current model URL: " + MODEL_URL
        );
        return null;
    }
}

// ============================================
// PREDICTION FUNCTION
// ============================================
async function runPrediction(imageDataUrl) {
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    const img = new Image();
    img.src = imageDataUrl;
    
    img.onload = async function() {
        try {
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

            // Normalize to [0,1] range
            const normalized = tensor.div(255.0);

            // Run prediction
            let predictions;
            try {
                predictions = await model.predict(normalized);
            } catch (predictError) {
                console.log("Normalization failed, trying raw tensor...");
                predictions = await model.predict(tensor);
            }
            
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

            const predictedClass = PLANTVILLAGE_CLASSES[maxIndex] || 'Unknown';
            const confidence = Math.round(maxConfidence * 100);
            const isHealthy = predictedClass.toLowerCase().includes('healthy');
            
            console.log(`📊 Prediction: ${predictedClass}, Confidence: ${confidence}%`);
            
            displayResult({
                disease: predictedClass,
                confidence: confidence,
                isHealthy: isHealthy
            });
            
            // Clean up tensors
            tensor.dispose();
            normalized.dispose();
            predictions.dispose();
            
        } catch (error) {
            console.error("❌ Prediction error:", error);
            resultContainer.innerHTML = `
                <div class="error">
                    <strong>❌ Prediction Error</strong>
                    <p>${error.message || 'Something went wrong. Please try again.'}</p>
                    <p style="margin-top:8px;font-size:0.9rem;">
                        <small>Note: Make sure the model URL is accessible and the image is clear.</small>
                    </p>
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

// ============================================
// DISPLAY RESULT
// ============================================
function displayResult(result) {
    const isHealthy = result.isHealthy;
    const cardClass = isHealthy ? 'result-card' : 'result-card affected';
    const statusText = isHealthy ? '🌿 Healthy' : '⚠️ Affected';
    const icon = isHealthy ? '🌿' : '⚠️';
    const statusClass = isHealthy ? 'healthy' : 'affected';
    
    let recommendation = '';
    if (!isHealthy && result.confidence >= 50) {
        recommendation = `
            <div class="advice">
                <strong>💡 Treatment Recommendation:</strong>
                <p>Based on the detection of <strong>${result.disease}</strong>:</p>
                <ul>
                    <li>Consult with an agricultural expert for confirmation</li>
                    <li>Consider appropriate organic fungicides or pesticides</li>
                    <li>Remove affected leaves to prevent spread</li>
                    <li>Monitor the plant regularly</li>
                </ul>
            </div>
        `;
    } else if (isHealthy && result.confidence >= 50) {
        recommendation = `
            <div class="advice" style="background: rgba(232, 245, 233, 0.8); border-left-color: #2e7d32;">
                <strong>✅ Plant is Healthy!</strong>
                <p>Your plant shows no signs of disease. Continue with regular care:</p>
                <ul>
                    <li>Water appropriately</li>
                    <li>Ensure adequate sunlight</li>
                    <li>Monitor for pests regularly</li>
                </ul>
            </div>
        `;
    }
    
    let confidenceWarning = '';
    if (result.confidence < 50) {
        confidenceWarning = `
            <div class="advice" style="background: rgba(255, 243, 224, 0.8); border-left-color: #ff6f00;">
                <strong>⚠️ Low Confidence Warning</strong>
                <p>This prediction has low confidence (${result.confidence}%).</p>
                <p style="font-size:0.9rem;margin-top:4px;">
                    Try taking a clearer photo with better lighting or a closer view of the leaf.
                </p>
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
            <p class="detail"><strong>Model:</strong> PlantVillage Dataset (38 classes)</p>
            
            ${confidenceWarning}
            ${recommendation}
            
            <div style="margin-top:12px;font-size:0.85rem;color:#666;text-align:center;border-top:1px solid rgba(0,0,0,0.1);padding-top:12px;">
                <small>🔬 Powered by TensorFlow.js • PlantVillage Dataset • 38 Disease Classes</small>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZE
// ============================================
console.log("🌱 Plant Disease Detector starting...");
console.log("📊 Using PlantVillage dataset with 38 disease classes");

// Load model in background
loadModel();

// Start with camera tab active
cameraTabBtn.classList.add('active');
startCamera();
