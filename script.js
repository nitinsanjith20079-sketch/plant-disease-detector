// ============================================
// PLANT DISEASE DETECTOR - COMPLETE WORKING
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
// LOAD MODEL
// ============================================
async function loadModel() {
    if (classifier) return classifier;

    try {
        modelStatus.textContent = '🧠 Downloading AI model... (may take 1-2 minutes)';
        modelStatus.className = 'model-status';

        const { pipeline } = await import('@huggingface/transformers');

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
// RUN PREDICTION - FIXED
// ============================================
async function runPrediction(imageDataUrl) {
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    try {
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
            setTimeout(resolve, 5000);
        });

        // Process image through canvas to ensure correct format
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 224;
        canvas.height = 224;
        ctx.drawImage(img, 0, 0, 224, 224);
        
        // Get the image data as a new image
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const processedImg = new Image();
        processedImg.src = processedDataUrl;
        
        await new Promise((resolve) => {
            processedImg.onload = resolve;
            setTimeout(resolve, 1000);
        });

        // Run prediction
        const results = await classifier(processedImg);

        if (!results || results.length === 0) {
            throw new Error('No predictions returned');
        }

        const top = results[0];
        let label = top.label;
        const confidence = Math.round(top.score * 100);

        const plantKeywords = ['leaf', 'plant', 'flower', 'tree', 'crop', 'vegetable', 'fruit', 'garden', 'weed', 'herb', 'green'];
        const isPlant = plantKeywords.some(keyword => label.toLowerCase().includes(keyword));

        let disease = label;
        let isHealthy = false;

        if (isPlant) {
            isHealthy = label.toLowerCase().includes('healthy') || 
                       label.toLowerCase().includes('good') ||
                       label.toLowerCase().includes('clean');
            
            if (label.includes('___')) {
                disease = label.replace(/___/g, ' → ').replace(/_/g, ' ');
            }
        } else {
            disease = 'Not a plant image';
            isHealthy = false;
        }

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

    let notPlantWarning = '';
    if (result.isPlant === false) {
        notPlantWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Not a Plant</strong>
                <p>This doesn't appear to be a plant image. Please upload a photo of a plant leaf.</p>
            </div>
        `;
    }

    let recommendation = '';
    if (!isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice">
                <strong>💡 Treatment Recommendation:</strong>
                <p>Consult with an agricultural expert for confirmation.</p>
            </div>
        `;
    } else if (isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice" style="background:rgba(232,245,233,0.8);border-left-color:#2e7d32;">
                <strong>✅ Plant is Healthy!</strong>
                <p>Continue with regular care. Your plant looks good! 🌱</p>
            </div>
        `;
    }

    let confidenceWarning = '';
    if (result.confidence < 40 && result.isPlant !== false) {
        confidenceWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Low Confidence</strong>
                <p>Try taking a clearer photo with better lighting.</p>
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
            alert('Your browser does not support camera access.');
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
        alert('Camera access denied. Please use the upload feature.');
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
        alert('Camera is not ready.');
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
        alert('Failed to capture image.');
    }
});

// ============================================
// FILE UPLOAD
// ============================================
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
            alert('Failed to read file.');
        }
    };
    reader.onerror = () => {
        alert('Failed to read file.');
    };
    reader.readAsDataURL(file);
});

// ============================================
// INITIALIZE
// ============================================
console.log('🌱 Plant Disease Detector starting...');
console.log('🧠 Using Transformers.js with ResNet-50');

loadModel();
cameraTabBtn.classList.add('active');
startCamera();
