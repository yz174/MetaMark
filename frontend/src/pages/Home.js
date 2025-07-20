import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BookmarkCard from '../components/BookmarkCard';
import api from '../utils/api';
import './Home.css';
import { useTheme } from '../contexts/ThemeContext';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableBookmarkCard = ({ bookmark, onDelete, onSummaryUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bookmark-card-wrapper">
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <BookmarkCard
        bookmark={bookmark}
        onDelete={onDelete}
        onSummaryUpdate={onSummaryUpdate}
      />
    </div>
  );
};


const Home = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const data = await api.getBookmarks();
      setBookmarks(data || []);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      const newBookmark = await api.addBookmark(newUrl); // Pass URL string directly
      setBookmarks([newBookmark, ...bookmarks]);
      setNewUrl('');
    } catch (error) {
      setError(error.message || 'Failed to add bookmark');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteBookmark = async (id) => {
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
      try {
        await api.deleteBookmark(id);
        setBookmarks(bookmarks.filter((b) => b.id !== id));
      } catch (error) {
        setError('Failed to delete bookmark. Please try again.');
      }
    }
  };

  const handleSummaryUpdate = (id, summary) => {
    setBookmarks(bookmarks.map(bookmark => 
      bookmark.id === id ? { ...bookmark, summary } : bookmark
    ));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setBookmarks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>MetaMark</h1>
        <div className="user-section">
          <button onClick={toggleTheme} className="theme-toggle-btn" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            {theme === 'light' ? (
              <span role="img" aria-label="dark"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9.001 9.001 0 0 1 11.21 3c.05.33.09.67.09 1.01a8 8 0 1 0 8 8c0-.34-.04-.68-.09-1.01z" fill="#FDB813"/></svg></span>
            ) : (
              <span role="img" aria-label="light"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.25" fill="#fff176"/><g stroke="#FDB813" strokeWidth="2"><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="5.34" y1="5.34" x2="7.23" y2="7.23"/><line x1="16.77" y1="16.77" x2="18.66" y2="18.66"/><line x1="5.34" y1="18.66" x2="7.23" y2="16.77"/><line x1="16.77" y1="7.23" x2="18.66" y2="5.34"/></g></svg></span>
            )}
          </button>
          <span>Welcome, {user?.email}</span>
          <button onClick={logout} className="logout-btn"><span>Logout</span></button>
        </div>
      </header>

      <div className="add-bookmark-section">
        <form onSubmit={handleAddBookmark} className="add-bookmark-form">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Paste a URL to save..."
            required
            className="url-input"
          />
          <button type="submit" disabled={adding} className="add-btn">
            {adding ? 'Fetching metadata & summary...' : 'Add Bookmark'}
          </button>
        </form>
        <div className="filter-section">
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter by tag..."
            className="tag-filter-input"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bookmarks}
          strategy={verticalListSortingStrategy}
        >
          <div className="bookmarks-grid">
            {bookmarks
              .filter(bookmark => !tagFilter || (bookmark.tags && bookmark.tags.includes(tagFilter)))
              .slice(0, visibleCount)
              .map((bookmark) => (
              <SortableBookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDeleteBookmark}
                onSummaryUpdate={handleSummaryUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleCount < bookmarks.length && (
        <button onClick={() => setVisibleCount(visibleCount + 10)} className="show-more-btn">
          Show More
        </button>
      )}
    </div>
  );
};

export default Home;
