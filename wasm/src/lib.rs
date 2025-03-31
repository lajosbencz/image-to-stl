//! WebAssembly module for generating STL files from binary image data.

mod geometry;
mod stl;
mod model;

use wasm_bindgen::prelude::*;
use model::ModelParameters;

/// Generates an STL file from binary image data.
///
/// # Parameters
///
/// * `binary_data` - The binary image data (0 = empty, 1 = filled).
/// * `img_width` - The width of the image in pixels.
/// * `img_height` - The height of the image in pixels.
/// * `physical_width` - The physical width of the model in millimeters.
/// * `physical_height` - The physical height of the model in millimeters.
/// * `depth` - The depth (thickness) of the model in millimeters.
///
/// # Returns
///
/// The binary STL file data.
#[wasm_bindgen]
pub fn generate_stl(
    binary_data: &[u8],
    img_width: usize,
    img_height: usize,
    physical_width: f32,
    physical_height: f32,
    depth: f32,
) -> Vec<u8> {
    // Create model parameters
    let params = ModelParameters {
        binary_data: binary_data.to_vec(),
        img_width,
        img_height,
        physical_width,
        physical_height,
        depth,
    };
    
    // Generate triangles for the model
    let triangles = model::generate_model_triangles(&params);
    
    // Create an STL writer
    let mut stl_writer = stl::StlWriter::new();
    
    // Write each triangle to the STL file
    for triangle in triangles {
        stl_writer.write_triangle(&triangle);
    }
    
    // Finalize and return the STL data
    stl_writer.finalize()
}
