import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image, Film, Music, FileText, Plus, Calendar, Tag, Link, Gamepad } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api, { uploadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Dropdown from './Dropdown';
import TagInput from './TagInput';

const UploadModal = ({ isOpen, onClose, onUpload, type = 'image', initialData = null, customFields = [] }) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const isEditing = !!initialData;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.url || initialData?.audio || initialData?.video || null);
  
  // Secondary file (Cover image for Music/Video/Event)
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(initialData?.cover || initialData?.thumbnail || initialData?.image || null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState(initialData?.category || ''); // Default to empty, will fetch later or user input
  const [tags, setTags] = useState(initialData?.tags || ''); // Tags state
  const [description, setDescription] = useState(initialData?.excerpt || initialData?.description || '');
  const [content, setContent] = useState(initialData?.content || ''); // Full content
  const [artist, setArtist] = useState(initialData?.artist || '');
  
  // Photo specific
  const [gameType, setGameType] = useState(initialData?.gameType || 'puzzle');
  const [gameDescription, setGameDescription] = useState(initialData?.gameDescription || '');
  
  // Event specific
  const [eventDate, setEventDate] = useState(initialData?.date || '');
  const [eventLocation, setEventLocation] = useState(initialData?.location || '');
  const [eventLink, setEventLink] = useState(initialData?.link || '');

  // Reset form when modal opens with new data or closes
  React.useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setTitle(initialData.title || '');
            setCategory(initialData.category || '未分类');
            setTags(initialData.tags || '');
            setDescription(initialData.excerpt || initialData.description || '');
            setContent(initialData.content || '');
            setArtist(initialData.artist || '');
            setGameType(initialData.gameType || 'puzzle');
            setGameDescription(initialData.gameDescription || '');
            setEventDate(initialData.date || '');
            setEventLocation(initialData.location || '');
            setEventLink(initialData.link || '');
            setPreview(initialData.url || initialData.audio || initialData.video || null);
            setCoverPreview(initialData.cover || initialData.thumbnail || initialData.image || null);
        } else {
            setTitle('');
            setCategory('未分类'); 
            setTags('');
            setDescription('');
            setContent('');
            setArtist('');
            setGameType('puzzle');
            setGameDescription('');
            setEventDate('');
            setEventLocation('');
            setEventLink('');
            setPreview(null);
            setCoverPreview(null);
        }
        setFile(null);
        setCoverFile(null);
    }
  }, [isOpen, initialData]);

  const handleFileChange = (e, isCover = false) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isCover) {
            setCoverFile(selectedFile);
            setCoverPreview(reader.result);
        } else {
            setFile(selectedFile);
            setPreview(reader.result);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
        toast.error(t('upload.title_required'));
        return;
    }
    if (!isEditing && type !== 'event' && !file) {
        toast.error(t('upload.file_required'));
        return;
    }

    setIsUploading(true);

    try {
      // 1. Upload files to server
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (coverFile) formData.append('cover', coverFile);

      let fileUrl = preview;
      let coverUrl = coverPreview;

      if (file || coverFile) {
          const uploadRes = await uploadFile('/upload', formData);
          const uploadData = uploadRes.data;
          if (file) fileUrl = uploadData.fileUrl;
          if (coverFile) coverUrl = uploadData.coverUrl;
      }

      // 2. Construct new item
      const newItem = {
        ...initialData, // Keep existing ID and other fields if editing
        title,
        category,
        tags, // Include tags
        tag: tags, // For backward compatibility with article 'tag'
        url: fileUrl, 
        
        // Music specific
        audio: type === 'audio' ? fileUrl : null,
        artist: type === 'audio' ? (artist || 'Unknown Artist') : null,
        
        // Video specific
        video: type === 'video' ? fileUrl : null,
        
        // Event specific
        image: type === 'event' ? (coverUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1000&auto=format&fit=crop') : null,
        date: type === 'event' ? eventDate : new Date().toLocaleDateString(),
        location: type === 'event' ? eventLocation : null,
        link: type === 'event' ? eventLink : null,
        status: type === 'event' ? (new Date(eventDate) > new Date() ? 'Upcoming' : 'Past') : null,

        // Cover/Thumbnail logic
        cover: coverUrl || (type === 'image' ? fileUrl : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
        thumbnail: coverUrl || (type === 'image' ? fileUrl : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',

        excerpt: description,
        content: content || `<p>${description}</p>`, // Use content if available, else fallback
        description: description, // for events/photos consistency
        
        // Defaults if new
        ...(!isEditing ? {
            gameType: type === 'image' ? gameType : 'puzzle',
            gameDescription: type === 'image' ? gameDescription : 'User uploaded content',
            duration: 0,
            size: 'small',
        } : {
            // If editing, update these too if type matches
            ...(type === 'image' ? { gameType, gameDescription } : {})
        })
      };

      await onUpload(newItem);
      
      const successMessage = isEditing 
        ? 'Updated successfully!' 
        : 'Uploaded successfully!';
      
      toast.success(successMessage);
      onClose();

    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'video': return <Film size={48} className="text-gray-400" />;
      case 'audio': return <Music size={48} className="text-gray-400" />;
      case 'article': return <FileText size={48} className="text-gray-400" />;
      case 'event': return <Calendar size={48} className="text-gray-400" />;
      default: return <Image size={48} className="text-gray-400" />;
    }
  };

  const getAcceptType = (isCover = false) => {
    if (isCover) return "image/*";
    switch(type) {
        case 'video': return "video/*";
        case 'audio': return "audio/*";
        case 'article': return "image/*"; 
        case 'event': return "image/*";
        default: return "image/*";
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar z-10"
            onClick={e => e.stopPropagation()}
          >
             {/* Glass Effect Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none" />

            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-md z-20">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {getIcon()} {isEditing ? t('admin.edit_item') : t('common.upload')} {type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">
              
              {/* Main File Upload (Skip for Event, use Cover instead as main image) */}
              {type !== 'event' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                    {t(`common.${type}`)}
                </label>
                <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center group hover:border-white/40 transition-colors bg-white/5">
                    <input
                    type="file"
                    accept={getAcceptType()}
                    onChange={(e) => handleFileChange(e, false)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    
                    {preview ? (
                        type === 'audio' ? (
                            <div className="text-center">
                                <Music size={48} className="text-green-400 mx-auto mb-2" />
                                <p className="text-green-400 font-medium text-sm break-all">{file?.name}</p>
                            </div>
                        ) : type === 'video' ? (
                            <video src={preview} className="max-h-48 rounded-lg" controls />
                        ) : (
                            <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
                        )
                    ) : (
                    <>
                        <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                        {getIcon()}
                        </div>
                        <p className="text-gray-400 text-sm text-center">
                        {t('common.upload')} {t(`common.${type}`)}
                        </p>
                    </>
                    )}
                </div>
              </div>
              )}

              {/* Cover Image Upload (For Audio/Video/Event) */}
              {(type === 'audio' || type === 'video' || type === 'event') && (
                 <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">{type === 'event' ? t('common.image') : t('common.cover')}</label>
                    <div className="relative border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center group hover:border-white/40 transition-colors bg-white/5 h-32">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, true)}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {coverPreview ? (
                            <img src={coverPreview} alt="Cover Preview" className="h-full rounded-lg object-contain" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <Plus size={24} className="text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">{t('common.upload')} {t('common.image')}</span>
                            </div>
                        )}
                    </div>
                 </div>
              )}

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('common.title')}</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                    placeholder="Enter title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('upload.tags')}</label>
                  <TagInput 
                    value={tags}
                    onChange={setTags}
                    placeholder={t('upload.tags_placeholder')}
                  />
                </div>

                {type === 'image' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Game Type</label>
                            <Dropdown
                                value={gameType}
                                onChange={setGameType}
                                options={[
                                    { value: '益智', label: '益智' },
                                    { value: '动作', label: '动作' },
                                    { value: '策略', label: '策略' },
                                    { value: '角色扮演', label: '角色扮演' },
                                    { value: '冒险', label: '冒险' }
                                ]}
                                icon={Gamepad}
                                buttonClassName="bg-black/20 border-white/10 hover:bg-black/30 w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Game Description</label>
                            <input
                                type="text"
                                value={gameDescription}
                                onChange={e => setGameDescription(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                                placeholder="Short game desc..."
                            />
                        </div>
                    </div>
                )}

                {type === 'event' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('common.date')}</label>
                            <input
                                type="date"
                                required
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('common.location')}</label>
                            <input
                                type="text"
                                required
                                value={eventLocation}
                                onChange={e => setEventLocation(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                                placeholder="e.g. Online, City Hall..."
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-1">活动链接 (外部链接)</label>
                            <div className="relative">
                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="url"
                                    value={eventLink}
                                    onChange={e => setEventLink(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-white/30"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {type === 'audio' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('common.artist')}</label>
                        <input
                            type="text"
                            value={artist}
                            onChange={e => setArtist(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                            placeholder="Artist name..."
                        />
                    </div>
                )}
                
                {(type === 'article' || type === 'event') && (
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('common.description')} (摘要)</label>
                            <textarea
                                required
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30 h-24"
                                placeholder="Short description or excerpt..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">详细内容 (支持 HTML)</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30 h-48 font-mono text-sm"
                                placeholder="<p>Detailed content here...</p>"
                            />
                        </div>
                    </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  disabled={isUploading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common.uploading')}...
                      </>
                  ) : (
                      <>
                        <Upload size={20} />
                        {isEditing ? t('common.save') : t('common.upload')}
                      </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;
