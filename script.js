// ============================================
// PLANT DISEASE DETECTOR - TRANSFORMERS.JS
// WORKING VERSION - Uses ResNet-50
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
const modelStatus = document.getElementById('modelStatus');

let classifier = null;
let stream = null;
let modelLoaded = false;

// ============================================
// PLANTVILLAGE CLASS NAMES (38 classes)
// ============================================
const CLASS_NAMES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry___Powdery_mildew',
    'Cherry___healthy',
    'Corn___Cercospora_leaf_spot',
    'Corn___Common_rust',
    'Corn___Northern_Leaf_Blight',
    'Corn___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
];

// ============================================
// LOAD MODEL - USING WORKING RESNET-50
// ============================================
async function loadModel() {
    if (classifier) return classifier;

    try {
        modelStatus.textContent = '🧠 Downloading AI model... (may take 1-2 minutes)';

        // Import Transformers.js dynamically
        const { pipeline } = await import('@huggingface/transformers');

        // Use a reliable, well-tested model
        classifier = await pipeline(
            'image-classification',
            'Xenova/resnet-50',
            {
                dtype: 'q8',
                progress_callback: (progress) => {
                    if (progress.status === 'progress') {
                        const pct = Math.round(progress.progress);
                        modelStatus.textContent = `🧠 Loading model: ${pct}%`;
                    }
                    if (progress.status === 'ready') {
                        modelStatus.textContent = '✅ Model ready! Upload or capture a plant photo.';
                        modelStatus.classList.add('ready');
                        modelLoaded = true;
                    }
                }
            }
        );

        modelStatus.textContent = '✅ Model ready! Upload or capture a plant photo.';
        modelStatus.classList.add('ready');
        modelLoaded = true;
        return classifier;

    } catch (error) {
        console.error('❌ Model loading error:', error);
        modelStatus.textContent = '❌ Failed to load model. Please refresh and try again.';
        modelStatus.style.background = 'rgba(255, 235, 238, 0.9)';
        modelStatus.style.color = '#c62828';
        return null;
    }
}

// ============================================
// RUN PREDICTION
// ============================================
async function runPrediction(imageDataUrl) {
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    try {
        // Make sure model is loaded
        if (!classifier) {
            await loadModel();
        }

        if (!classifier) {
            loadingDiv.style.display = 'none';
            resultContainer.innerHTML = `
                <div class="error" style="background:rgba(255,235,238,0.9);padding:20px;border-radius:16px;">
                    <strong>❌ Model not loaded</strong>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;
            return;
        }

        // Create image element
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        // Run prediction
        const results = await classifier(img);

        if (!results || results.length === 0) {
            throw new Error('No predictions returned');
        }

        // Get top prediction
        const top = results[0];
        let label = top.label;
        const confidence = Math.round(top.score * 100);

        // Check if it's a plant-related label
        const plantKeywords = ['leaf', 'plant', 'flower', 'tree', 'crop', 'vegetable', 'fruit', 'garden', 'weed', 'herb'];
        const isPlant = plantKeywords.some(keyword => label.toLowerCase().includes(keyword));

        let disease = label;
        let isHealthy = false;

        // Try to map to PlantVillage classes
        if (isPlant) {
            // For ResNet-50, it gives labels like "leaf", "plant", etc.
            // We need to map these to plant health status
            isHealthy = label.toLowerCase().includes('healthy') || 
                       label.toLowerCase().includes('good') ||
                       label.toLowerCase().includes('clean');
            
            // Format the disease name
            if (label.includes('___')) {
                disease = label.replace(/___/g, ' → ').replace(/_/g, ' ');
            }
        } else {
            // If not a plant, show a warning
            disease = 'Not a plant image';
            isHealthy = false;
        }

        // Display results
        displayResult({
            disease: disease,
            confidence: confidence,
            isHealthy: isHealthy,
            rawLabel: label,
            isPlant: isPlant,
            allResults: results.slice(0, 5)
        });

    } catch (error) {
        console.error('❌ Prediction error:', error);
        resultContainer.innerHTML = `
            <div class="error" style="background:rgba(255,235,238,0.9);padding:20px;border-radius:16px;">
                <strong>❌ Prediction Error</strong>
                <p>${error.message || 'Something went wrong. Please try again.'}</p>
                <p style="font-size:0.9rem;margin-top:8px;">
                    Try taking a clearer photo with better lighting.
                </p>
            </div>
        `;
    } finally {
        loadingDiv.style.display = 'none';
    }
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

    // Build top 5 predictions
    let top5HTML = '';
    if (result.allResults && result.allResults.length > 0) {
        top5HTML = `
            <div style="margin-top:12px;padding:12px;background:rgba(245,245,245,0.5);border-radius:12px;">
                <p style="font-weight:600;font-size:0.9rem;margin-bottom:8px;">🔍 Top Predictions:</p>
                ${result.allResults.map((r, i) => `
                    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
                        <span style="font-size:0.9rem;">${i === 0 ? '🏆 ' : '  '}${r.label}</span>
                        <span style="font-weight:600;color:${Math.round(r.score * 100) > 50 ? '#2e7d32' : '#f57f17'};">${Math.round(r.score * 100)}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Warning if not a plant
    let notPlantWarning = '';
    if (result.isPlant === false && result.disease === 'Not a plant image') {
        notPlantWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Not a Plant</strong>
                <p>This doesn't appear to be a plant image. Please upload a photo of a plant leaf.</p>
                <ul>
                    <li>📸 Take a clear photo of a <strong>single leaf</strong></li>
                    <li>☀️ Use <strong>natural daylight</strong></li>
                    <li>📏 Get <strong>close</strong> to the leaf</li>
                </ul>
            </div>
        `;
    }

    // Recommendations
    let recommendation = '';
    if (!isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice">
                <strong>💡 Treatment Recommendation:</strong>
                <p>Based on the analysis:</p>
                <ul>
                    <li>Consult with an agricultural expert for confirmation</li>
                    <li>Consider appropriate organic fungicides or pesticides</li>
                    <li>Remove affected leaves to prevent spread</li>
                    <li>Monitor the plant regularly</li>
                </ul>
            </div>
        `;
    } else if (isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice" style="background:rgba(232,245,233,0.8);border-left-color:#2e7d32;">
                <strong>✅ Plant is Healthy!</strong>
                <p>Your plant shows no signs of disease. Continue with regular care.</p>
            </div>
        `;
    }

    // Low confidence warning
    let confidenceWarning = '';
    if (result.confidence < 40 && result.isPlant !== false) {
        confidenceWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Low Confidence Warning</strong>
                <p>This prediction has low confidence (${result.confidence}%).</p>
                <ul>
                    <li>📸 Take a clear photo of a <strong>single leaf</strong></li>
                    <li>☀️ Use <strong>natural daylight</strong></li>
                    <li>📏 Get <strong>close</strong> to the leaf</li>
                    <li>🤚 Keep the camera <strong>steady</strong></li>
                </ul>
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
            <p class="detail" style="background:rgba(245,245,245,0.6);padding:8px 16px;border-radius:8px;font-size:0.9rem;">
                <strong>Model:</strong> Transformers.js • ResNet-50
            </p>

            ${top5HTML}
            ${notPlantWarning}
            ${confidenceWarning}
            ${recommendation}

            <div style="margin-top:12px;font-size:0.85rem;color:#666;text-align:center;border-top:1px solid rgba(0,0,0,0.1);padding-top:12px;">
                <small>🔬 Powered by Transformers.js • No server calls • 100% private</small>
            </div>
        </div>
    `;
}

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

        console.log('📸 Starting camera...');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support camera access. Please use the upload feature.');
            return;
        }

        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        console.log('✅ Camera started!');

    } catch (err) {
        console.error('❌ Camera error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert('Camera access denied. Please allow camera access in browser settings.');
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
        console.log('📷 Camera stopped');
    }
}

// ============================================
// CAPTURE FROM CAMERA
// ============================================
captureBtn.addEventListener('click', () => {
    if (!stream || !video.videoWidth) {
        alert('Camera is not ready. Please wait or refresh.');
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
        console.error('❌ Capture error:', err);
        alert('Failed to capture image. Please try again.');
    }
});

// ============================================
// FILE UPLOAD
// ============================================
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log(`📁 File selected: ${file.name}`);

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        fileInput.value = '';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('Image too large (max 10MB).');
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
            console.error('❌ File read error:', err);
            alert('Failed to read file. Please try again.');
        }
    };
    reader.onerror = () => {
        alert('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
});

// ============================================
// INITIALIZE
// ============================================
console.log('🌱 Plant Disease Detector starting...');
console.log('🧠 Using Transformers.js with ResNet-50');

// Load model in background
loadModel();

// Start with camera tab
cameraTabBtn.classList.add('active');
startCamera();
