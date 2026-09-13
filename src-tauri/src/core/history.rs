use super::document::Document;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct HistoryAction {
    pub id: String,
    pub description: String,
    pub timestamp: u64,
}

pub struct HistoryEngine {
    undo_stack: Vec<(HistoryAction, Document)>,
    redo_stack: Vec<(HistoryAction, Document)>,
    max_history: usize,
}

impl HistoryEngine {
    pub fn new(max_history: usize) -> Self {
        Self {
            undo_stack: Vec::with_capacity(max_history),
            redo_stack: Vec::new(),
            max_history: max_history.max(2),
        }
    }

    pub fn push_state(&mut self, description: impl Into<String>, doc: &Document) {
        let action = HistoryAction {
            id: uuid::Uuid::new_v4().to_string(),
            description: description.into(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        if self.undo_stack.len() >= self.max_history {
            self.undo_stack.remove(0);
        }

        // Thanks to Arc-based SparseTileGrid, doc.clone() is Copy-on-Write and extremely cheap!
        self.undo_stack.push((action, doc.clone()));
        self.redo_stack.clear();
    }

    pub fn undo(&mut self, current_doc: &mut Document) -> Option<HistoryAction> {
        if self.undo_stack.len() <= 1 {
            return None;
        }
        let (action, prev_doc) = self.undo_stack.pop()?;

        self.redo_stack.push((action.clone(), current_doc.clone()));
        *current_doc = prev_doc;

        Some(action)
    }

    pub fn redo(&mut self, current_doc: &mut Document) -> Option<HistoryAction> {
        let (action, next_doc) = self.redo_stack.pop()?;

        self.undo_stack.push((action.clone(), current_doc.clone()));
        *current_doc = next_doc;

        Some(action)
    }

    pub fn get_history_list(&self) -> Vec<HistoryAction> {
        self.undo_stack.iter().map(|(a, _)| a.clone()).collect()
    }

    pub fn rename_last(&mut self, description: String) {
        if let Some((action, _)) = self.undo_stack.last_mut() {
            action.description = description;
        }
    }

    pub fn len(&self) -> usize {
        self.undo_stack.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn undo_redo_preserve_pixels_labels_and_initial_state() {
        let mut doc = Document::new("Test", 4, 4);
        let mut history = HistoryEngine::new(50);
        history.push_state("Initialize", &doc);
        assert!(history.undo(&mut doc).is_none());
        history.push_state("Paint", &doc);
        doc.layers[1].grid.set_pixel_cow(1, 1, [255, 0, 0, 255]);
        history.rename_last("Red dot".into());
        assert_eq!(history.undo(&mut doc).unwrap().description, "Red dot");
        assert_eq!(doc.layers[1].grid.get_pixel(1, 1), [0, 0, 0, 0]);
        assert_eq!(history.redo(&mut doc).unwrap().description, "Red dot");
        assert_eq!(doc.layers[1].grid.get_pixel(1, 1), [255, 0, 0, 255]);
        history.undo(&mut doc);
        history.push_state("New branch", &doc);
        assert!(history.redo(&mut doc).is_none());
    }
    #[test]
    fn zero_capacity_does_not_panic() {
        let doc = Document::new("Test", 1, 1);
        let mut history = HistoryEngine::new(0);
        for _ in 0..10 {
            history.push_state("Action", &doc);
        }
        assert_eq!(history.len(), 2);
    }
    #[test]
    fn undo_multiple_moves_clears_remnants() {
        let mut doc = Document::new("Test", 1024, 512);
        let mut history = HistoryEngine::new(50);
        history.push_state("Initialize", &doc);

        doc.layers[1].grid.set_pixel_cow(100, 100, [255, 0, 0, 255]);
        history.push_state("Paint", &doc);

        let mut img1 = vec![0u8; 1024 * 512 * 4];
        let idx1 = (100 * 1024 + 600) * 4;
        img1[idx1] = 255;
        img1[idx1 + 3] = 255;
        history.push_state("Move 1", &doc);
        doc.layers[1].grid.write_region(0, 0, 1024, 512, &img1);

        let mut img2 = vec![0u8; 1024 * 512 * 4];
        let idx2 = (100 * 1024 + 700) * 4;
        img2[idx2] = 255;
        img2[idx2 + 3] = 255;
        history.push_state("Move 2", &doc);
        doc.layers[1].grid.write_region(0, 0, 1024, 512, &img2);

        assert_eq!(doc.layers[1].grid.get_pixel(700, 100), [255, 0, 0, 255]);
        assert_eq!(doc.layers[1].grid.get_pixel(600, 100), [0, 0, 0, 0]);
        assert_eq!(doc.layers[1].grid.get_pixel(100, 100), [0, 0, 0, 0]);

        history.undo(&mut doc);
        assert_eq!(doc.layers[1].grid.get_pixel(600, 100), [255, 0, 0, 255]);
        assert_eq!(doc.layers[1].grid.get_pixel(700, 100), [0, 0, 0, 0]);
        assert_eq!(doc.layers[1].grid.get_pixel(100, 100), [0, 0, 0, 0]);

        history.undo(&mut doc);
        assert_eq!(doc.layers[1].grid.get_pixel(100, 100), [255, 0, 0, 255]);
        assert_eq!(doc.layers[1].grid.get_pixel(600, 100), [0, 0, 0, 0]);
        assert_eq!(doc.layers[1].grid.get_pixel(700, 100), [0, 0, 0, 0]);
    }
}
