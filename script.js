// ============================================
// PLANT DISEASE DETECTOR - PLANT.ID API
// Real plant disease detection with 80-95% accuracy
// Free tier: 50 requests/month
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

let stream = null;

// ============================================
// PLANT.ID API CONFIGURATION
// ============================================
// FREE API KEY - Limited to 50 requests/month
// Sign up at https://plant.id to get your own key
const API_KEY = 'YOUR_FREE_API_KEY_HERE'; // Get from plant.id

// ============================================
// DIAGNOSE PLANT USING PLANT.ID API
// ============================================
async function diagnosePlant(imageDataUrl) {
    try {
        // Convert base64 to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('images', blob, 'plant.jpg');
        formData.append('health', 'all');
        
        // Make API request
        const apiResponse = await fetch('https://api.plant.id/v2/health_assessment', {
            method: 'POST',
            headers: {
                'Api-Key': API_KEY,
            },
            body: formData
        });
        
        if (!apiResponse.ok) {
            throw new Error(`API Error: ${apiResponse.status}`);
        }
        
        const result = await apiResponse.json();
        return result;
        
    } catch (error) {
        console.error('❌ API Error:', error);
        return null;
    }
}

// ============================================
// GET PLANT DISEASE INFORMATION
// ============================================
function getDiseaseInfo(result) {
    if (!result || !result.health_assessment) {
        return null;
    }
    
    const health = result.health_assessment;
    
    // Check if plant is healthy
    if (health.is_healthy) {
        return {
            disease: 'Healthy Plant',
            isHealthy: true,
            confidence: Math.round(health.is_healthy_probability * 100),
            details: 'Your plant appears to be healthy! Continue regular care.',
            diseases: []
        };
    }
    
    // Get diseases
    const diseases = health.diseases || [];
    if (diseases.length === 0) {
        return {
            disease: 'Unknown',
            isHealthy: false,
            confidence: 0,
            details: 'Could not identify specific disease.',
            diseases: []
        };
    }
    
    // Get the top disease
    const topDisease = diseases[0];
    const diseaseName = topDisease.name || 'Unknown Disease';
    const confidence = Math.round((topDisease.probability || 0) * 100);
    
    // Get disease details
    let details = `Detected: ${diseaseName}`;
    let recommendation = 'Consult with an agricultural expert for confirmation.';
    
    // Add specific recommendations based on disease
    const diseaseLower = diseaseName.toLowerCase();
    if (diseaseLower.includes('blight')) {
        recommendation = 'Remove affected leaves, apply fungicide, and improve air circulation.';
    } else if (diseaseLower.includes('spot') || diseaseLower.includes('scab')) {
        recommendation = 'Remove affected leaves and apply appropriate fungicide.';
    } else if (diseaseLower.includes('mildew')) {
        recommendation = 'Improve air circulation, reduce humidity, and apply fungicide.';
    } else if (diseaseLower.includes('rust')) {
        recommendation = 'Remove infected leaves and apply rust-specific fungicide.';
    } else if (diseaseLower.includes('virus')) {
        recommendation = 'Remove infected plants to prevent spread. No cure available.';
    } else if (diseaseLower.includes('mold')) {
        recommendation = 'Improve air circulation and reduce humidity.';
    }
    
    // Get all diseases for display
    const allDiseases = diseases.slice(0, 3).map(d => ({
        name: d.name || 'Unknown Disease',
        confidence: Math.round((d.probability || 0) * 100)
    }));
    
    return {
        disease: diseaseName,
        isHealthy: false,
        confidence: confidence,
        details: details,
        recommendation: recommendation,
        diseases: allDiseases
    };
}

// ============================================
// RUN PREDICTION
// ============================================
async function runPrediction(imageDataUrl) {
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    try {
        // Check if API key is set
        if (API_KEY === 'YOUR_FREE_API_KEY_HERE') {
            loadingDiv.style.display = 'none';
            resultContainer.innerHTML = `
                <div class="error" style="background:rgba(255,235,238,0.9);padding:20px;border-radius:16px;">
                    <strong>⚠️ API Key Required</strong>
                    <p>Please sign up at <a href="https://plant.id" target="_blank">plant.id</a> to get a free API key.</p>
                    <p style="font-size:0.9rem;margin-top:8px;">
                        Then replace <code>YOUR_FREE_API_KEY_HERE</code> in script.js with your key.
                    </p>
                    <p style="font-size:0.85rem;margin-top:4px;color:#666;">
                        Free tier: 50 requests/month
                    </p>
                </div>
            `;
            return;
        }

        // Load image
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
        });

        // Call Plant.id API
        const result = await diagnosePlant(imageDataUrl);
        
        if (!result) {
            throw new Error('Failed to get diagnosis. Please try again.');
        }

        // Process results
        const diseaseInfo = getDiseaseInfo(result);
        
        if (!diseaseInfo) {
            throw new Error('Could not analyze the image. Please try again.');
        }

        displayResult({
            disease: diseaseInfo.disease,
            confidence: diseaseInfo.confidence,
            isHealthy: diseaseInfo.isHealthy,
            details: diseaseInfo.details || '',
            recommendation: diseaseInfo.recommendation || '',
            diseases: diseaseInfo.diseases || []
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
                <p style="font-size:0.85rem;margin-top:4px;color:#666;">
                    💡 Make sure you have internet connection for the API call.
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

    // Build diseases list
    let diseasesHTML = '';
    if (result.diseases && result.diseases.length > 0) {
        diseasesHTML = `
            <div style="margin-top:12px;padding:12px;background:rgba(245,245,245,0.5);border-radius:12px;">
                <p style="font-weight:600;font-size:0.9rem;margin-bottom:8px;">🔍 Detected Diseases:</p>
                ${result.diseases.map((d, i) => `
                    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
                        <span style="font-size:0.9rem;">${i === 0 ? '🏆 ' : '  '}${d.name}</span>
                        <span style="font-weight:600;color:${d.confidence > 50 ? '#2e7d32' : '#f57f17'};">${d.confidence}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Recommendations
    let recommendationHTML = '';
    if (!isHealthy && result.confidence >= 30) {
        recommendationHTML = `
            <div class="advice">
                <strong>💡 Recommendation:</strong>
                <p>${result.recommendation || 'Consult with an agricultural expert for confirmation.'}</p>
            </div>
        `;
    } else if (isHealthy && result.confidence >= 30) {
        recommendationHTML = `
            <div class="advice" style="background:rgba(232,245,233,0.8);border-left-color:#2e7d32;">
                <strong>✅ Plant is Healthy!</strong>
                <p>Continue with regular care. 🌱</p>
            </div>
        `;
    }

    // Low confidence warning
    let confidenceWarning = '';
    if (result.confidence < 30) {
        confidenceWarning = `
            <div class="advice" style="background:rgba(255,243,224,0.8);border-left-color:#ff6f00;">
                <strong>⚠️ Low Confidence</strong>
                <p>Try taking a clearer photo with better lighting.</p>
                <ul>
                    <li>📸 Take a photo of a <strong>single leaf</strong></li>
                    <li>☀️ Use <strong>natural daylight</strong></li>
                    <li>📏 Get <strong>close</strong> to the leaf</li>
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
                <div class="confidence-fill" style="width: ${Math.min(result.confidence, 100)}%;"></div>
            </div>

            <p><strong>Confidence:</strong> ${result.confidence}%</p>
            <p><strong>Detected:</strong> ${result.disease}</p>
            <p class="detail" style="background:rgba(245,245,245,0.6);padding:8px 16px;border-radius:8px;font-size:0.9rem;">
                <strong>Model:</strong> Plant.id API • Real disease detection
            </p>

            ${diseasesHTML}
            ${confidenceWarning}
            ${recommendationHTML}

            <div style="margin-top:12px;font-size:0.85rem;color:#666;text-align:center;border-top:1px solid rgba(0,0,0,0.1);padding-top:12px;">
                <small>🔬 Powered by Plant.id API • ${isHealthy ? '🌿 Healthy' : '⚠️ Disease detected'}</small>
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
console.log('🧠 Using Plant.id API for real disease detection');

modelStatus.textContent = '✅ Ready! Upload or capture a plant photo.';
modelStatus.classList.add('ready');

cameraTabBtn.classList.add('active');
startCamera();
