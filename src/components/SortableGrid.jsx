/**
 * Sortable Grid Component
 * Drag and drop sorting with touch support
 * Uses native HTML5 drag and drop with fallback for mobile
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { GripVertical, Loader2 } from 'lucide-react';

/**
 * Sortable Item Component
 */
const SortableItem = ({ 
  item, 
  index, 
  isDragging, 
  dragHandleProps,
  renderItem,
  onDragStart,
  onDragEnd
}) => {
  return (
    <Reorder.Item
      value={item}
      id={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging 
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.2)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileDrag={{ 
        scale: 1.05,
        zIndex: 50,
        cursor: 'grabbing'
      }}
      transition={{ 
        duration: 0.2,
        layout: { duration: 0.2 }
      }}
      className={`
        relative bg-white/5 backdrop-blur-sm rounded-xl 
        border border-white/10 overflow-hidden
        ${isDragging ? 'border-indigo-500/50' : 'hover:border-white/20'}
        transition-colors duration-200
      `}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-stretch">
        {/* Drag Handle */}
        <motion.div
          {...dragHandleProps}
          className="flex items-center justify-center px-3 cursor-grab active:cursor-grabbing
                     text-gray-500 hover:text-white transition-colors
                     border-r border-white/5 bg-white/[0.02]"
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <GripVertical size={20} />
        </motion.div>
        
        {/* Item Content */}
        <div className="flex-1 p-4">
          {renderItem(item, index)}
        </div>
      </div>
    </Reorder.Item>
  );
};

/**
 * Sortable Grid Component
 */
export const SortableGrid = ({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
  className = '',
  axis = 'y',
  disabled = false,
  onDragStart,
  onDragEnd
}) => {
  const [orderedItems, setOrderedItems] = useState(items);
  const [activeId, setActiveId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with external items
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleReorder = useCallback((newOrder) => {
    setOrderedItems(newOrder);
  }, []);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active?.id);
    onDragStart?.(event);
  }, [onDragStart]);

  const handleDragEnd = useCallback(async (event) => {
    setActiveId(null);
    
    if (event.over) {
      setIsSaving(true);
      try {
        await onReorder?.(orderedItems);
      } finally {
        setIsSaving(false);
      }
    }
    
    onDragEnd?.(event);
  }, [orderedItems, onReorder, onDragEnd]);

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)} className="mb-3">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Saving Indicator */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 right-0 z-10 flex items-center gap-2 
                     px-3 py-1.5 bg-indigo-500/20 backdrop-blur-md rounded-full
                     border border-indigo-500/30"
          >
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span className="text-xs text-indigo-300">保存中...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Reorder.Group
        axis={axis}
        values={orderedItems}
        onReorder={handleReorder}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {orderedItems.map((item, index) => (
            <SortableItem
              key={keyExtractor(item)}
              item={item}
              index={index}
              isDragging={activeId === item.id}
              renderItem={renderItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
};

/**
 * Sortable Photo Grid
 * Specialized for photo gallery with thumbnails
 */
export const SortablePhotoGrid = ({
  photos,
  onReorder,
  onPhotoClick,
  disabled = false
}) => {
  const [orderedPhotos, setOrderedPhotos] = useState(photos);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    setOrderedPhotos(photos);
  }, [photos]);

  const handleReorder = useCallback((newOrder) => {
    setOrderedPhotos(newOrder);
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (onReorder) {
      await onReorder(orderedPhotos);
    }
  }, [orderedPhotos, onReorder]);

  return (
    <Reorder.Group
      axis="y"
      values={orderedPhotos}
      onReorder={handleReorder}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <AnimatePresence mode="popLayout">
        {orderedPhotos.map((photo, index) => (
          <Reorder.Item
            key={photo.id}
            value={photo}
            id={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: activeId === photo.id ? 1.05 : 1,
              zIndex: activeId === photo.id ? 50 : 1
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileDrag={{ 
              scale: 1.05,
              zIndex: 50,
              cursor: 'grabbing'
            }}
            onDragStart={() => setActiveId(photo.id)}
            onDragEnd={() => {
              setActiveId(null);
              handleDragEnd();
            }}
            className={`
              relative aspect-square rounded-xl overflow-hidden
              bg-white/5 border border-white/10
              ${activeId === photo.id ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : ''}
              ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
            onClick={() => !activeId && onPhotoClick?.(index)}
          >
            <img
              src={photo.thumbnail || photo.url}
              alt={photo.title}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
            
            {/* Drag Handle Overlay */}
            {!disabled && (
              <div className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 
                            backdrop-blur-sm text-white/70">
                <GripVertical size={16} />
              </div>
            )}
            
            {/* Order Number */}
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md 
                          bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              #{index + 1}
            </div>
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
};

/**
 * Sortable List with Numbers
 * For ordered lists like playlists, albums
 */
export const SortableList = ({
  items,
  onReorder,
  renderItem,
  showNumbers = true,
  disabled = false
}) => {
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleReorder = useCallback((newOrder) => {
    setOrderedItems(newOrder);
    onReorder?.(newOrder);
  }, [onReorder]);

  return (
    <Reorder.Group
      axis="y"
      values={orderedItems}
      onReorder={handleReorder}
      className="space-y-2"
    >
      <AnimatePresence mode="popLayout">
        {orderedItems.map((item, index) => (
          <Reorder.Item
            key={item.id}
            value={item}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileDrag={{ scale: 1.02, zIndex: 10 }}
            className={`
              flex items-center gap-3 p-3 rounded-lg
              bg-white/5 border border-white/10
              hover:border-white/20 transition-colors
              ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
          >
            {showNumbers && (
              <span className="w-8 text-center text-gray-500 font-mono text-sm">
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            
            {!disabled && (
              <GripVertical size={18} className="text-gray-500" />
            )}
            
            <div className="flex-1">
              {renderItem(item, index)}
            </div>
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
};

/**
 * Album Organizer
 * Drag photos between albums
 */
export const AlbumOrganizer = ({
  albums,
  unassignedPhotos,
  onPhotoMove,
  onAlbumReorder
}) => {
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverAlbum, setDragOverAlbum] = useState(null);

  const handleDragStart = (photo) => {
    setDraggedPhoto(photo);
  };

  const handleDragOver = (e, albumId) => {
    e.preventDefault();
    setDragOverAlbum(albumId);
  };

  const handleDrop = async (e, albumId) => {
    e.preventDefault();
    if (draggedPhoto) {
      await onPhotoMove?.(draggedPhoto.id, albumId);
      setDraggedPhoto(null);
      setDragOverAlbum(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Unassigned Photos */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-semibold text-white mb-4">未分类照片</h3>
        <div className="grid grid-cols-2 gap-3">
          {unassignedPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(photo)}
              whileHover={{ scale: 1.02 }}
              className="aspect-square rounded-lg overflow-hidden bg-white/5 
                       border border-white/10 cursor-grab active:cursor-grabbing"
            >
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.title}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Albums */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">相册</h3>
        
        {albums.map((album) => (
          <motion.div
            key={album.id}
            onDragOver={(e) => handleDragOver(e, album.id)}
            onDrop={(e) => handleDrop(e, album.id)}
            onDragLeave={() => setDragOverAlbum(null)}
            animate={{
              borderColor: dragOverAlbum === album.id 
                ? 'rgba(99, 102, 241, 0.5)' 
                : 'rgba(255, 255, 255, 0.1)',
              backgroundColor: dragOverAlbum === album.id 
                ? 'rgba(99, 102, 241, 0.1)' 
                : 'rgba(255, 255, 255, 0.02)'
            }}
            className="p-4 rounded-xl border-2 border-dashed transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">{album.name}</h4>
              <span className="text-sm text-gray-400">
                {album.photos?.length || 0} 张照片
              </span>
            </div>
            
            {album.photos?.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {album.photos.slice(0, 4).map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden bg-white/5"
                  >
                    <img
                      src={photo.thumbnail || photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                拖拽照片到此处
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default {
  SortableGrid,
  SortablePhotoGrid,
  SortableList,
  AlbumOrganizer
};
