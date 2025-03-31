//! Triangle representation for 3D models.

use super::Vector3;

/// A 3D triangle with three vertices and a normal vector.
#[derive(Debug, Clone, Copy)]
pub struct Triangle {
    /// The normal vector of the triangle.
    pub normal: Vector3,
    /// The three vertices of the triangle.
    pub vertices: [Vector3; 3],
}

impl Triangle {
    /// Creates a new triangle with the given normal vector and vertices.
    #[allow(dead_code)]
    pub fn new(normal: Vector3, vertices: [Vector3; 3]) -> Self {
        Self { normal, vertices }
    }

    /// Creates a new triangle from arrays of [x, y, z] coordinates.
    pub fn from_arrays(normal: [f32; 3], vertices: [[f32; 3]; 3]) -> Self {
        Self {
            normal: Vector3::from_array(normal),
            vertices: [
                Vector3::from_array(vertices[0]),
                Vector3::from_array(vertices[1]),
                Vector3::from_array(vertices[2]),
            ],
        }
    }
}
