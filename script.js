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
    
    if (file
