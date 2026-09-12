use super::payloads::SharedEngineState;
use serde::Deserialize;
use tauri::{
    ipc::{InvokeBody, Request},
    State,
};

#[derive(Deserialize)]
struct PixelHeader {
    layer_id: Option<String>,
    start_x: i32,
    start_y: i32,
    width: u32,
    height: u32,
    action_name: Option<String>,
}

fn decode_pixels(bytes: &[u8]) -> Result<(PixelHeader, &[u8]), String> {
    let prefix: [u8; 4] = bytes
        .get(..4)
        .ok_or("Missing pixel header")?
        .try_into()
        .map_err(|_| "Invalid header")?;
    let end = 4usize
        .checked_add(u32::from_le_bytes(prefix) as usize)
        .ok_or("Invalid header size")?;
    let header: PixelHeader = serde_json::from_slice(bytes.get(4..end).ok_or("Truncated header")?)
        .map_err(|e| e.to_string())?;
    let pixels = bytes.get(end..).ok_or("Missing pixels")?;
    let expected = (header.width as usize)
        .checked_mul(header.height as usize)
        .and_then(|n| n.checked_mul(4))
        .ok_or("Pixel region too large")?;
    if header.width == 0 || header.height == 0 || pixels.len() != expected {
        return Err("Invalid pixel region length".into());
    }
    Ok((header, pixels))
}

#[tauri::command]
pub fn write_layer_pixels_binary(
    request: Request<'_>,
    state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected binary pixels".into());
    };
    let (header, pixels) = decode_pixels(bytes)?;
    let mut guard = state.lock();
    let id = header
        .layer_id
        .as_ref()
        .or(guard.document.active_layer_id.as_ref())
        .ok_or("No active layer")?;
    let index = guard
        .document
        .layers
        .iter()
        .position(|l| &l.id == id)
        .ok_or("Layer not found")?;
    if guard.document.layers[index].locked {
        return Err("Layer is locked".into());
    }
    if header.start_x < 0
        || header.start_y < 0
        || header.start_x as u64 + header.width as u64 > guard.document.width as u64
        || header.start_y as u64 + header.height as u64 > guard.document.height as u64
    {
        return Err("Pixel region is outside the document".into());
    }
    guard.push_history(
        header
            .action_name
            .unwrap_or_else(|| "Write Pixel Region".into()),
    );
    guard.document.layers[index].grid.write_region(
        header.start_x,
        header.start_y,
        header.width,
        header.height,
        pixels,
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_truncated_and_wrong_length_payloads() {
        assert!(decode_pixels(&[]).is_err());
        assert!(decode_pixels(&100u32.to_le_bytes()).is_err());
        let header = br#"{"start_x":0,"start_y":0,"width":2,"height":1}"#;
        let mut bytes = (header.len() as u32).to_le_bytes().to_vec();
        bytes.extend(header);
        bytes.extend([0; 4]);
        assert!(decode_pixels(&bytes).is_err());
        bytes.extend([0; 4]);
        assert_eq!(decode_pixels(&bytes).unwrap().1.len(), 8);
    }
}
