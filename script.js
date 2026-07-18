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

// --- Camera Functions ---
async function startCamera() {
    try {
        if (stream) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera access denied:", err);
        alert("Could not access the camera. Please allow camera access or use the upload feature.");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
    }
}

// --- Capture from Camera ---
captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    runPrediction(imageDataUrl);
});

// --- File Upload ---
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageDataUrl = e.target.result;
        imagePreview.innerHTML = `<img src="${imageDataUrl}" alt="Uploaded Image">`;
        runPrediction(imageDataUrl);
    };
    reader.readAsDataURL(file);
});

// --- Model Loading and Prediction ---
async function loadModel() {
    if (model) return model;
    // Using a public pre-trained MobileNet model for classification
    // You can replace this URL with your own converted PlantVillage model
    try {
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        return model;
    } catch (error) {
        console.error("Error loading model:", error);
        alert("Failed to load the AI model. Please check your internet connection.");
        return null;
    }
}

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

            // Preprocess image for MobileNet
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224]) // MobileNet input size
                .toFloat()
                .expandDims();

            // Get predictions
            const predictions = await model.predict(tensor);
            const data = await predictions.data();
            
            // Find the top prediction
            let maxConfidence = 0;
            let maxIndex = 0;
            for (let i = 0; i < data.length; i++) {
                if (data[i] > maxConfidence) {
                    maxConfidence = data[i];
                    maxIndex = i;
                }
            }

            // MobileNet class labels mapping (simplified for demo)
            // For a real PlantVillage model, you would use the 38 disease class names
            const classNames = [
                'Apple Scab', 'Apple Black Rot', 'Apple Cedar Rust', 'Apple Healthy',
                'Corn Cercospora', 'Corn Common Rust', 'Corn Northern Leaf Blight', 'Corn Healthy',
                'Potato Early Blight', 'Potato Late Blight', 'Potato Healthy',
                'Tomato Bacterial Spot', 'Tomato Early Blight', 'Tomato Late Blight',
                'Tomato Leaf Mold', 'Tomato Septoria Leaf Spot', 'Tomato Spider Mites',
                'Tomato Target Spot', 'Tomato Yellow Leaf Curl', 'Tomato Mosaic Virus', 'Tomato Healthy'
            ];
            
            // Check if the prediction is likely a plant/leaf
            const topClass = classNames[maxIndex] || 'Unknown';
            const confidence = Math.round(maxConfidence * 100);
            
            // Determine if the prediction is "healthy" (you can adjust this logic)
            const isHealthy = topClass.toLowerCase().includes('healthy');
            
            // Display result
            const result = {
                disease: topClass,
                confidence: confidence,
                isHealthy: isHealthy
            };
            displayResult(result);
            
        } catch (error) {
            console.error("Prediction error:", error);
            resultContainer.innerHTML = `<div class="error">Error during prediction. Please try again.</div>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    };
}

function displayResult(result) {
    const cardClass = result.isHealthy ? 'result-card' : 'result-card affected';
    const statusText = result.isHealthy ? '🌿 Healthy' : '⚠️ Affected';
    const icon = result.isHealthy ? '🌿' : '⚠️';
    
    resultContainer.innerHTML = `
        <div class="${cardClass}">
            <div class="status-icon">${icon}</div>
            <h3>Analysis Result</h3>
            <p class="status">${statusText}</p>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${result.confidence}%;"></div>
            </div>
            <p>Confidence: ${result.confidence}%</p>
            <p><strong>Detected Condition:</strong> ${result.disease}</p>
            ${!result.isHealthy ? `
                <div class="advice">
                    <strong>💡 Recommendation:</strong> 
                    <p>Consult with an agricultural expert. Consider using appropriate organic pesticides or fungicides.</p>
                </div>
            ` : `
                <div class="advice" style="background: #e8f5e9;">
                    <strong>✅ Plant appears healthy!</strong>
                    <p>Continue regular monitoring and care.</p>
                </div>
            `}
        </div>
    `;
}

// --- Initialize ---
// Load model in background
loadModel();

// Start the app with camera tab active
cameraTabBtn.classList.add('active');
startCamera();
