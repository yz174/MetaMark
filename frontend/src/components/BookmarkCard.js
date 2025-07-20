import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../utils/api';
import './BookmarkCard.css';

// Modal component using React Portal
const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

const BookmarkCard = ({ bookmark, onDelete, onSummaryUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation(); // Prevent modal from opening when clicking delete
    
    if (!onDelete) {
      console.error('Delete function not provided');
      return;
    }

    if (window.confirm('Are you sure you want to delete this bookmark?')) {
      try {
        await onDelete(bookmark.id);
      } catch (error) {
        console.error('Error deleting bookmark:', error);
        alert('Failed to delete bookmark. Please try again.');
      }
    }
  };

  const handleFetchSummary = async (e) => {
    if (e) e.stopPropagation(); // Prevent modal from opening when clicking fetch
    setLoading(true);
    try {
      const updatedBookmark = await api.updateBookmark(bookmark.id, { needsSummary: true });
      onSummaryUpdate(bookmark.id, updatedBookmark.summary);
    } catch (error) {
      alert(error.message || 'Failed to fetch summary');
    }
    setLoading(false);
  };

  const truncateSummary = (text, maxLength = 200) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatSummaryForDisplay = (text) => {
    if (!text) return '';
    // Split into paragraphs for better readability
    const paragraphs = text.split(/\n\n|\. (?=[A-Z])/).filter(p => p.trim());
    return paragraphs.map((p, index) => (
      <p key={index} className="modal-paragraph">
        {p.trim()}{!p.endsWith('.') && '.'}
      </p>
    ));
  };

  return (
    <>
      <div className="bookmark-card" onClick={() => setShowModal(true)}>
        <div className="bookmark-header">
          <div className="bookmark-title-section">
            <img 
              src={bookmark.favicon || `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`}
              alt="" 
              className="bookmark-favicon"
              onError={(e) => {
                // Try Google Favicon service as fallback
                const url = new URL(bookmark.url);
                const fallbackUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
                if (e.target.src !== fallbackUrl) {
                  e.target.src = fallbackUrl;
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
            <h3 className="bookmark-title">
              {bookmark.title || 'Untitled'}
            </h3>
          </div>
          <button 
            onClick={handleDelete}
            onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
            className="delete-btn" 
            title="Delete bookmark"
            type="button"
            aria-label="Delete bookmark"
          >
            ×
          </button>
        </div>
        
        <div className="bookmark-url-section">
          <img 
            src={bookmark.favicon || `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=16`}
            alt="" 
            className="bookmark-favicon-small"
            onError={(e) => {
              // Try Google Favicon service as fallback
              const url = new URL(bookmark.url);
              const fallbackUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
              if (e.target.src !== fallbackUrl) {
                e.target.src = fallbackUrl;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
          <div className="bookmark-url">{bookmark.url}</div>
        </div>
        
        <div className="bookmark-summary">
          {bookmark.summary ? (
            <p className="summary-text">
              {truncateSummary(bookmark.summary)}
            </p>
          ) : (
            <div className="no-summary">
              <p>No summary available</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleFetchSummary();
                }} 
                disabled={loading}
                className="fetch-summary-btn"
              >
                {loading ? 'Fetching...' : 'Fetch Summary'}
              </button>
            </div>
          )}
        </div>
        
        <div className="bookmark-date">
          Added: {new Date(bookmark.created_at).toLocaleDateString()}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="modal-header">
          <h3>{bookmark.title || 'Bookmark Details'}</h3>
        </div>
        <div className="modal-body">
          {bookmark.summary ? (
            formatSummaryForDisplay(bookmark.summary)
          ) : (
            <p>No summary available for this bookmark.</p>
          )}
        </div>
        <div className="modal-footer">
          <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="modal-link"
          >
            Visit Page
          </a>
          <button 
            className="modal-button" 
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};

export default BookmarkCard;
