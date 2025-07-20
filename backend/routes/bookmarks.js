const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { fetchMetadata, fetchSummary } = require('../utils/metadata');

const router = express.Router();

// All bookmark routes require authentication
router.use(authenticateToken);

// Get all bookmarks for authenticated user
router.get('/', (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, bookmarks) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch bookmarks' });
      }
      res.json(bookmarks);
    }
  );
});

// Create a new bookmark
router.post('/', async (req, res) => {
  const { url } = req.body;
  const userId = req.user.id;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL
    new URL(url);

    // Fetch metadata
    const { title, favicon } = await fetchMetadata(url);
    
    // Fetch summary
    let summary = null;
    try {
      summary = await fetchSummary(url);
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        console.log('Rate limit hit, saving bookmark without summary');
      }
    }

    // Insert bookmark into database
    db.run(
      `INSERT INTO bookmarks (user_id, url, title, favicon, summary) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, url, title, favicon, summary],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save bookmark' });
        }

        // Return the created bookmark
        db.get(
          'SELECT * FROM bookmarks WHERE id = ?',
          [this.lastID],
          (err, bookmark) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch bookmark' });
            }
            res.status(201).json(bookmark);
          }
        );
      }
    );
  } catch (error) {
    if (error.message === 'Invalid URL') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    res.status(500).json({ error: 'Failed to process bookmark' });
  }
});

// Update bookmark summary (in case it failed initially)
router.patch('/:id/summary', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // First check if bookmark belongs to user
  db.get(
    'SELECT * FROM bookmarks WHERE id = ? AND user_id = ?',
    [id, userId],
    async (err, bookmark) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      try {
        const summary = await fetchSummary(bookmark.url);
        
        if (summary) {
          db.run(
            'UPDATE bookmarks SET summary = ? WHERE id = ?',
            [summary, id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to update summary' });
              }
              res.json({ message: 'Summary updated', summary });
            }
          );
        } else {
          res.status(500).json({ error: 'Failed to fetch summary' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
});

// Delete a bookmark
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run(
    'DELETE FROM bookmarks WHERE id = ? AND user_id = ?',
    [id, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete bookmark' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      res.json({ message: 'Bookmark deleted successfully' });
    }
  );
});

module.exports = router;
