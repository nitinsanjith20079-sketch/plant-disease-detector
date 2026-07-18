// Replace the runPrediction function with this:

async function runPrediction(imageDataUrl) {
    // Show loading state
    loadingDiv.style.display = 'block';
    resultContainer.innerHTML = '';

    try {
        // Convert image to blob for API upload
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('image', blob, 'plant.jpg');

        // Use a free plant disease API
        // Option A: Plant.id API (free tier available)
        const apiKey = 'YOUR_API_KEY'; // Get from plant.id
        const apiResponse = await fetch('https://api.plant.id/v2/health_assessment', {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
            },
            body: formData
        });

        const result = await apiResponse.json();
        
        // Parse the response
        const isHealthy = result.health_assessment?.is_healthy || false;
        const disease = result.health_assessment?.disease?.name || 'Unknown';
        const confidence = Math.round((result.health_assessment?.disease?.probability || 0) * 100);
        
        displayResult({
            disease: disease,
            confidence: confidence,
            isHealthy: isHealthy
        });

    } catch (error) {
        console.error('API Error:', error);
        // Fallback to local prediction
        await localPrediction(imageDataUrl);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Keep this as fallback
async function localPrediction(imageDataUrl) {
    // Your existing prediction code here
    // ... (the code you already have)
}
