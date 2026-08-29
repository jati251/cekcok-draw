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
            max_history,
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
        let (action, prev_doc) = self.undo_stack.pop()?;
        
        let redo_action = HistoryAction {
            id: uuid::Uuid::new_v4().to_string(),
            description: format!("Before {}", action.description),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        self.redo_stack.push((redo_action, current_doc.clone()));
        *current_doc = prev_doc;

        Some(action)
    }

    pub fn redo(&mut self, current_doc: &mut Document) -> Option<HistoryAction> {
        let (action, next_doc) = self.redo_stack.pop()?;
        
        let undo_action = HistoryAction {
            id: uuid::Uuid::new_v4().to_string(),
            description: format!("Undo {}", action.description),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        self.undo_stack.push((undo_action, current_doc.clone()));
        *current_doc = next_doc;

        Some(action)
    }

    pub fn get_history_list(&self) -> Vec<HistoryAction> {
        self.undo_stack.iter().map(|(a, _)| a.clone()).collect()
    }
}
