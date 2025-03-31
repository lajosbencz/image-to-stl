//! STL file writer implementation.

use std::io::{Cursor, Write};
use crate::geometry::Triangle;

/// Writer for STL (STereoLithography) files in binary format.
pub struct StlWriter {
    /// The buffer containing the STL data.
    buffer: Cursor<Vec<u8>>,
    /// The position in the buffer where the triangle count is stored.
    triangle_count_pos: u64,
    /// The number of triangles written.
    triangle_count: u32,
}

impl StlWriter {
    /// Creates a new STL writer.
    pub fn new() -> Self {
        let mut buffer = Cursor::new(Vec::new());
        
        // Write STL header (80 bytes of arbitrary data)
        buffer.write_all(&[0u8; 80]).unwrap();
        
        // Placeholder for triangle count (will be updated later)
        let triangle_count_pos = buffer.position();
        buffer.write_all(&[0u8; 4]).unwrap();
        
        Self {
            buffer,
            triangle_count_pos,
            triangle_count: 0,
        }
    }
    
    /// Writes a triangle to the STL file.
    pub fn write_triangle(&mut self, triangle: &Triangle) {
        // Write normal vector
        for &coord in &triangle.normal.to_array() {
            self.buffer.write_all(&coord.to_le_bytes()).unwrap();
        }
        
        // Write vertices
        for vertex in &triangle.vertices {
            for &coord in &vertex.to_array() {
                self.buffer.write_all(&coord.to_le_bytes()).unwrap();
            }
        }
        
        // Attribute byte count (0)
        self.buffer.write_all(&[0u8; 2]).unwrap();
        
        self.triangle_count += 1;
    }
    
    /// Finalizes the STL file and returns the binary data.
    pub fn finalize(mut self) -> Vec<u8> {
        // Update triangle count in the header
        self.buffer.set_position(self.triangle_count_pos);
        self.buffer.write_all(&self.triangle_count.to_le_bytes()).unwrap();
        
        // Return the STL data
        self.buffer.into_inner()
    }
}

impl Default for StlWriter {
    fn default() -> Self {
        Self::new()
    }
}
