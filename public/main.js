document.addEventListener('DOMContentLoaded', () => {
    // Debounce function to limit how often a function can be called
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const thresholdSlider = document.getElementById('threshold');
    const brightnessSlider = document.getElementById('brightness');
    const thresholdValue = document.getElementById('thresholdValue');
    const brightnessValue = document.getElementById('brightnessValue');
    const invertCheckbox = document.getElementById('invertImage');
    const unitsSelect = document.getElementById('units');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const depthInput = document.getElementById('depth');
    const unitLabels = document.querySelectorAll('.unit-label');
    const preview3dContainer = document.getElementById('preview3d');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Current image data
    let originalImageData = null;
    let processedImageData = null;
    let currentFileIsSvg = false;
    let currentStlData = null;
    
    // Three.js variables
    let scene, camera, renderer, controls, mesh;
    let isPreviewInitialized = false;
    
    // Initialize Three.js scene
    function initThreeJs() {
        if (isPreviewInitialized) return;
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, preview3dContainer.clientWidth / preview3dContainer.clientHeight, 0.1, 1000);
        camera.position.z = 100;
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(preview3dContainer.clientWidth, preview3dContainer.clientHeight);
        preview3dContainer.appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Add a grid helper
        const gridHelper = new THREE.GridHelper(100, 10);
        scene.add(gridHelper);
        
        // Start animation loop
        animate();
        
        isPreviewInitialized = true;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = preview3dContainer.clientWidth / preview3dContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(preview3dContainer.clientWidth, preview3dContainer.clientHeight);
        });
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    // Update 3D preview with STL data
    function updatePreview(stlData) {
        if (!isPreviewInitialized) {
            initThreeJs();
        }
        
        // Store current camera position and target if a mesh already exists
        let cameraPosition, cameraTarget;
        if (mesh) {
            cameraPosition = camera.position.clone();
            cameraTarget = controls.target.clone();
            scene.remove(mesh);
        }
        
        // Create a geometry from the STL data
        const geometry = new THREE.BufferGeometry();
        
        // Parse the STL binary data
        const reader = new DataView(stlData.buffer);
        const triangles = reader.getUint32(80, true);
        
        // Create position attribute
        const positions = new Float32Array(triangles * 9);
        const normals = new Float32Array(triangles * 9);
        
        for (let i = 0; i < triangles; i++) {
            const offset = 84 + i * 50;
            
            // Normal
            const nx = reader.getFloat32(offset, true);
            const ny = reader.getFloat32(offset + 4, true);
            const nz = reader.getFloat32(offset + 8, true);
            
            // Vertices
            for (let j = 0; j < 3; j++) {
                const vOffset = offset + 12 + j * 12;
                const vx = reader.getFloat32(vOffset, true);
                const vy = reader.getFloat32(vOffset + 4, true);
                const vz = reader.getFloat32(vOffset + 8, true);
                
                positions[i * 9 + j * 3] = vx;
                positions[i * 9 + j * 3 + 1] = vy;
                positions[i * 9 + j * 3 + 2] = vz;
                
                normals[i * 9 + j * 3] = nx;
                normals[i * 9 + j * 3 + 1] = ny;
                normals[i * 9 + j * 3 + 2] = nz;
            }
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        
        // Create material and mesh
        const material = new THREE.MeshPhongMaterial({
            color: 0x3f51b5,
            specular: 0x111111,
            shininess: 30,
            flatShading: true
        });
        
        mesh = new THREE.Mesh(geometry, material);
        
        // Center the model
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        mesh.position.sub(center);
        
        // Add to scene
        scene.add(mesh);
        
        // If we have stored camera position, restore it
        // Otherwise, set default camera position
        if (cameraPosition && cameraTarget) {
            camera.position.copy(cameraPosition);
            controls.target.copy(cameraTarget);
        } else {
            // Set initial camera position for first load
            const box = new THREE.Box3().setFromObject(mesh);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            camera.position.set(0, 0, maxDim * 2);
            camera.lookAt(0, 0, 0);
        }
        
        // Update controls
        controls.update();
    }
    
    // Generate STL and update 3D preview
    function generateSTLAndUpdatePreview() {
        if (!processedImageData) return;
        
        try {
            // Get parameters
            const width = parseFloat(widthInput.value);
            const height = parseFloat(heightInput.value);
            const depth = parseFloat(depthInput.value);
            const units = unitsSelect.value;
            
            // Convert to millimeters if needed
            const scale = units === 'inch' ? 25.4 : 1;
            const width_mm = width * scale;
            const height_mm = height * scale;
            const depth_mm = depth * scale;
            
            // Prepare binary image data (0 or 1)
            const binaryData = new Uint8Array(processedImageData.width * processedImageData.height);
            const data = processedImageData.data;
            
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                binaryData[j] = data[i] > 128 ? 1 : 0;
            }
            
            // Call WASM function to generate STL
            const stlData = window.generateSTL(
                binaryData,
                processedImageData.width,
                processedImageData.height,
                width_mm,
                height_mm,
                depth_mm
            );
            
            // Store the STL data for download
            currentStlData = stlData;
            
            // Update 3D preview
            updatePreview(stlData);
            
            // Create a blob and download link
            const blob = new Blob([stlData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = 'output.stl';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
            
            // Enable download button
            downloadBtn.disabled = false;
            
        } catch (error) {
            console.error('Error generating STL:', error);
            alert('Error generating STL. See console for details.');
        }
    }
    
    // Create a debounced version of generateSTLAndUpdatePreview
    const debouncedGenerateSTL = debounce(generateSTLAndUpdatePreview, 500);
    
    // Update unit labels when unit changes
    unitsSelect.addEventListener('change', () => {
        const unit = unitsSelect.value;
        unitLabels.forEach(label => {
            label.textContent = unit === 'mm' ? 'mm' : 'in';
        });
        debouncedGenerateSTL();
    });
    
    // Update displayed values for sliders
    thresholdSlider.addEventListener('input', () => {
        thresholdValue.textContent = thresholdSlider.value;
        if (originalImageData) {
            processImage();
            debouncedGenerateSTL();
        }
    });
    
    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = brightnessSlider.value;
        if (originalImageData) {
            processImage();
            debouncedGenerateSTL();
        }
    });
    
    // Add event listener for invert checkbox
    invertCheckbox.addEventListener('change', () => {
        if (originalImageData) {
            processImage();
            debouncedGenerateSTL();
        }
    });
    
    // Add event listeners for dimension inputs
    widthInput.addEventListener('input', debouncedGenerateSTL);
    heightInput.addEventListener('input', debouncedGenerateSTL);
    depthInput.addEventListener('input', debouncedGenerateSTL);
    
    // Handle image upload
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check if the file is an SVG
        currentFileIsSvg = file.type === 'image/svg+xml';
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            
            // For SVGs, we need to handle them differently
            if (currentFileIsSvg) {
                // Set crossOrigin to anonymous to avoid CORS issues with SVG
                img.crossOrigin = 'anonymous';
            }
            
            img.onload = () => {
                displayOriginalImage(img);
                processImage();
                generateSTLAndUpdatePreview();
            };
            
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    
    // Display original image
    function displayOriginalImage(img) {
        const ctx = originalCanvas.getContext('2d');
        
        // Set canvas size to match image (with max dimensions)
        const maxWidth = 400;
        const maxHeight = 400;
        let width, height;
        
        if (currentFileIsSvg) {
            // For SVGs, we need to handle sizing differently
            // SVGs can have viewBox or width/height attributes
            
            // Use default dimensions for SVGs if natural dimensions are not available
            width = img.naturalWidth || 400;
            height = img.naturalHeight || 400;
            
            // Maintain aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
        } else {
            // For raster images, use the image's dimensions
            width = img.width;
            height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
        }
        
        // Set canvas dimensions
        originalCanvas.width = width;
        originalCanvas.height = height;
        processedCanvas.width = width;
        processedCanvas.height = height;
        
        // Clear canvas before drawing
        ctx.clearRect(0, 0, width, height);
        
        // For SVGs, fill with white background to ensure no transparency
        if (currentFileIsSvg) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
        }
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        originalImageData = ctx.getImageData(0, 0, width, height);
    }
    
    // Process image with current settings
    function processImage() {
        if (!originalImageData) return;
        
        const width = originalImageData.width;
        const height = originalImageData.height;
        const threshold = parseInt(thresholdSlider.value);
        const brightness = parseInt(brightnessSlider.value);
        const invert = invertCheckbox.checked;
        
        // Create a copy of the original image data
        processedImageData = new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            width,
            height
        );
        
        const data = processedImageData.data;
        
        // Apply brightness, threshold, and invert
        for (let i = 0; i < data.length; i += 4) {
            // Get alpha value (for SVGs with transparency)
            const alpha = data[i + 3];
            
            // If pixel is mostly transparent (for SVGs), treat as white/empty
            if (alpha < 128) {
                data[i] = data[i + 1] = data[i + 2] = 255; // White
                continue;
            }
            
            // Convert to grayscale
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            // Apply brightness
            let adjusted = gray + brightness;
            adjusted = Math.max(0, Math.min(255, adjusted));
            
            // Apply threshold
            let binary = adjusted > threshold ? 255 : 0;
            
            // Apply invert if checked
            if (invert) {
                binary = 255 - binary;
            }
            
            // Set RGB to the binary value, alpha remains unchanged
            data[i] = data[i + 1] = data[i + 2] = binary;
        }
        
        // Display processed image
        const ctx = processedCanvas.getContext('2d');
        ctx.putImageData(processedImageData, 0, 0);
    }
});
