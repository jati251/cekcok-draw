use super::document::Document;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct HistoryAction {
    pub id: String,
    pub description: String,
    pub timestamp: u64,
}

/// A flat, display-ready view of the timeline: every undoable entry followed
/// by every redoable entry, plus the index of the currently active state.
#[derive(Clone, Serialize, Deserialize)]
pub struct HistoryState {
    pub entries: Vec<HistoryAction>,
    pub current_index: i32,
}

pub struct HistoryEngine {
    undo_stack: Vec<(HistoryAction, Document)>,
    redo_stack: Vec<(HistoryAction, Document)>,
    max_history: usize,
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
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
            timestamp: now_secs(),
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

        // Keep the original description so the redo branch reads naturally.
        let redo_action = HistoryAction {
            id: uuid::Uuid::new_v4().to_string(),
            description: action.description.clone(),
            timestamp: now_secs(),
        };
        self.redo_stack.push((redo_action, current_doc.clone()));
        *current_doc = prev_doc;

        Some(action)
    }

    pub fn redo(&mut self, current_doc: &mut Document) -> Option<HistoryAction> {
        let (action, next_doc) = self.redo_stack.pop()?;

        let undo_action = HistoryAction {
            id: uuid::Uuid::new_v4().to_string(),
            description: action.description.clone(),
            timestamp: now_secs(),
        };
        self.undo_stack.push((undo_action, current_doc.clone()));
        *current_doc = next_doc;

        Some(action)
    }

    /// Jumps to an absolute index in the flattened timeline. The index is
    /// clamped to a valid position; returns true if any navigation happened.
    pub fn jump_to(&mut self, target_index: i32, current_doc: &mut Document) -> bool {
        let current = self.current_index();
        if target_index == current {
            return false;
        }

        if target_index < current {
            for _ in 0..(current - target_index) {
                if self.undo(current_doc).is_none() {
                    return false;
                }
            }
        } else {
            for _ in 0..(target_index - current) {
                if self.redo(current_doc).is_none() {
                    return false;
                }
            }
        }
        true
    }

    pub fn get_history_list(&self) -> Vec<HistoryAction> {
        self.undo_stack.iter().map(|(a, _)| a.clone()).collect()
    }

    pub fn get_history_state(&self) -> HistoryState {
        let mut entries = Vec::with_capacity(self.undo_stack.len() + self.redo_stack.len());
        for (action, _) in &self.undo_stack {
            entries.push(action.clone());
        }
        for (action, _) in &self.redo_stack {
            entries.push(action.clone());
        }
        HistoryState {
            entries,
            current_index: self.current_index(),
        }
    }

    pub fn current_index(&self) -> i32 {
        if self.undo_stack.is_empty() {
            -1
        } else {
            self.undo_stack.len() as i32 - 1
        }
    }

    pub fn len(&self) -> usize {
        self.undo_stack.len()
    }

    pub fn is_empty(&self) -> bool {
        self.undo_stack.is_empty()
    }
}
