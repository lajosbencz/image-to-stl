//! 3D model generation from binary image data.

use crate::geometry::Triangle;

/// Parameters for generating a 3D model from binary image data.
pub struct ModelParameters {
    /// The binary image data (0 = empty, 1 = filled).
    pub binary_data: Vec<u8>,
    /// The width of the image in pixels.
    pub img_width: usize,
    /// The height of the image in pixels.
    pub img_height: usize,
    /// The physical width of the model in millimeters.
    pub physical_width: f32,
    /// The physical height of the model in millimeters.
    pub physical_height: f32,
    /// The depth (thickness) of the model in millimeters.
    pub depth: f32,
}

/// Generates triangles for a 3D model from binary image data.
/// 
/// This function creates separate objects for each extruded part to avoid non-manifold edges.
pub fn generate_model_triangles(params: &ModelParameters) -> Vec<Triangle> {
    let mut triangles = Vec::new();
    
    // Calculate scaling factors
    let pixel_width = params.physical_width / params.img_width as f32;
    let pixel_height = params.physical_height / params.img_height as f32;
    
    // Base z-coordinate
    let base_z = 0.0;
    let top_z = params.depth;
    
    // Create a grid to track which pixels are filled
    let mut filled_pixels = vec![false; params.img_width * params.img_height];
    
    // First pass: Mark filled pixels and generate extruded parts
    for y in 0..params.img_height {
        for x in 0..params.img_width {
            let idx = y * params.img_width + x;
            if params.binary_data[idx] == 1 {
                filled_pixels[idx] = true;
                
                let x_pos = x as f32 * pixel_width;
                let y_pos = y as f32 * pixel_height;
                let next_x = x_pos + pixel_width;
                let next_y = y_pos + pixel_height;
                
                // Bottom face (part of the extruded object, not the base)
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, -1.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, y_pos, base_z],
                        [next_x, next_y, base_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, -1.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, next_y, base_z],
                        [x_pos, next_y, base_z],
                    ]
                ));
                
                // Front face
                triangles.push(Triangle::from_arrays(
                    [0.0, -1.0, 0.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, y_pos, base_z],
                        [next_x, y_pos, top_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [0.0, -1.0, 0.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, y_pos, top_z],
                        [x_pos, y_pos, top_z],
                    ]
                ));
                
                // Back face
                triangles.push(Triangle::from_arrays(
                    [0.0, 1.0, 0.0],
                    [
                        [x_pos, next_y, base_z],
                        [next_x, next_y, top_z],
                        [next_x, next_y, base_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [0.0, 1.0, 0.0],
                    [
                        [x_pos, next_y, base_z],
                        [x_pos, next_y, top_z],
                        [next_x, next_y, top_z],
                    ]
                ));
                
                // Left face
                triangles.push(Triangle::from_arrays(
                    [-1.0, 0.0, 0.0],
                    [
                        [x_pos, y_pos, base_z],
                        [x_pos, y_pos, top_z],
                        [x_pos, next_y, top_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [-1.0, 0.0, 0.0],
                    [
                        [x_pos, y_pos, base_z],
                        [x_pos, next_y, top_z],
                        [x_pos, next_y, base_z],
                    ]
                ));
                
                // Right face
                triangles.push(Triangle::from_arrays(
                    [1.0, 0.0, 0.0],
                    [
                        [next_x, y_pos, base_z],
                        [next_x, next_y, top_z],
                        [next_x, y_pos, top_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [1.0, 0.0, 0.0],
                    [
                        [next_x, y_pos, base_z],
                        [next_x, next_y, base_z],
                        [next_x, next_y, top_z],
                    ]
                ));
                
                // Top face
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, 1.0],
                    [
                        [x_pos, y_pos, top_z],
                        [next_x, y_pos, top_z],
                        [next_x, next_y, top_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, 1.0],
                    [
                        [x_pos, y_pos, top_z],
                        [next_x, next_y, top_z],
                        [x_pos, next_y, top_z],
                    ]
                ));
            }
        }
    }
    
    // Second pass: Generate base triangles for empty areas
    // We'll use a simple approach: for each empty pixel, add a base triangle
    for y in 0..params.img_height {
        for x in 0..params.img_width {
            let idx = y * params.img_width + x;
            if !filled_pixels[idx] {
                let x_pos = x as f32 * pixel_width;
                let y_pos = y as f32 * pixel_height;
                let next_x = x_pos + pixel_width;
                let next_y = y_pos + pixel_height;
                
                // Base triangles for empty areas
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, -1.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, y_pos, base_z],
                        [next_x, next_y, base_z],
                    ]
                ));
                triangles.push(Triangle::from_arrays(
                    [0.0, 0.0, -1.0],
                    [
                        [x_pos, y_pos, base_z],
                        [next_x, next_y, base_z],
                        [x_pos, next_y, base_z],
                    ]
                ));
            }
        }
    }
    
    triangles
}
