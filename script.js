// ============================================
// PLANT DISEASE DETECTOR - TRANSFORMERS.JS FIXED
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

let pipeline = null;
let stream = null;

// ============================================
// LOAD MODEL - USING A SIMPLER APPROACH
// ============================================
async function loadModel() {
    if (pipeline) return pipeline;

    try {
        modelStatus.textContent = '🧠 Loading AI model... (may take 1-2 minutes)';
        modelStatus.className = 'model-status';

        // Import Transformers.js
        const { pipeline: createPipeline } = await import('@huggingface/transformers');

        // Create the pipeline with a simpler config
        pipeline = await createPipeline(
            'image-classification',
            'Xenova/vit-base-patch16-224',
            {
                // Use FP16 for better performance
                dtype: 'fp16',
                progress_callback: (progress) => {
                    if (progress.status === 'progress') {
                        const pct = Math.round(progress.progress);
                        modelStatus.textContent = `🧠 Loading model: ${pct}%`;
                    }
                    if (progress.status === 'ready') {
                        modelStatus.textContent = '✅ Model ready! Upload or capture a plant photo.';
                        modelStatus.classList.add('ready');
                    }
                }
            }
        );

        modelStatus.textContent = '✅ Model ready! Upload or capture a plant photo.';
        modelStatus.classList.add('ready');
        return pipeline;

    } catch (error) {
        console.error('❌ Model loading error:', error);
        modelStatus.textContent = '❌ Failed to load model. Please refresh and try again.';
        modelStatus.style.background = 'rgba(255, 235, 238, 0.9)';
        modelStatus.style.color = '#c62828';
        return null;
    }
}

// ============================================
// CONVERT IMAGE TO PROPER FORMAT
// ============================================
function imageToTensor(imageElement) {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize to model input size
    const size = 224;
    canvas.width = size;
    canvas.height = size;
    
    // Draw image
    ctx.drawImage(imageElement, 0, 0, size, size);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Convert to tensor format (we return as URL for the pipeline)
    return canvas.toDataURL('image/jpeg', 0.9);
}

// ============================================
// RUN PREDICTION - COMPLETE REWRITE
// ============================================
async function runPrediction(imageDataUrl) {
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    try {
        // Ensure model is loaded
        if (!pipeline) {
            await loadModel();
        }

        if (!pipeline) {
            loadingDiv.style.display = 'none';
            resultContainer.innerHTML = `
                <div class="error" style="background:rgba(255,235,238,0.9);padding:20px;border-radius:16px;">
                    <strong>❌ Model not loaded</strong>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;
            return;
        }

        // Load image
        const img = new Image();
        img.src = imageDataUrl;
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(resolve, 5000);
        });

        // Create a proper image element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const size = 224;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        
        // Create a new image from canvas
        const processedImg = new Image();
        processedImg.src = canvas.toDataURL('image/jpeg', 0.9);
        
        await new Promise((resolve) => {
            processedImg.onload = resolve;
            setTimeout(resolve, 1000);
        });

        // Run prediction
        const results = await pipeline(processedImg);

        if (!results || results.length === 0) {
            throw new Error('No predictions returned');
        }

        // Process results
        const top = results[0];
        let label = top.label;
        const confidence = Math.round(top.score * 100);

        // Check if it's a plant
        const plantKeywords = ['leaf', 'plant', 'flower', 'tree', 'crop', 'vegetable', 'fruit', 'garden', 'weed', 'herb', 'green', 'leafy'];
        const isPlant = plantKeywords.some(keyword => label.toLowerCase().includes(keyword));

        let disease = label;
        let isHealthy = false;

        if (isPlant) {
            isHealthy = label.toLowerCase().includes('healthy') || 
                       label.toLowerCase().includes('good') ||
                       label.toLowerCase().includes('clean');
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

    // Top 5 predictions
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

    // Not a plant warning
    let notPlantWarning = '';
    if (result.isPlant === false) {
        notPlantWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Not a Plant</strong>
                <p>This doesn't appear to be a plant image. Please upload a photo of a plant leaf.</p>
            </div>
        `;
    }

    // Recommendations
    let recommendation = '';
    if (!isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice">
                <strong>💡 Recommendation:</strong>
                <p>Consult with an agricultural expert for confirmation.</p>
            </div>
        `;
    } else if (isHealthy && result.confidence >= 40 && result.isPlant !== false) {
        recommendation = `
            <div class="advice" style="background:rgba(232,245,233,0.8);border-left-color:#2e7d32;">
                <strong>✅ Plant is Healthy!</strong>
                <p>Continue with regular care. 🌱</p>
            </div>
        `;
    }

    // Low confidence
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
                <strong>Model:</strong> Transformers.js • ViT-base
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
// CAPTURE
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
// UPLOAD
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
console.log('🧠 Using Transformers.js with ViT-base');

loadModel();
cameraTabBtn.classList.add('active');
startCamera();
