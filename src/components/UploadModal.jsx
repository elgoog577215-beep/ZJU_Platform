import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image, Film, Music, FileText, Plus, Calendar, Tag, Link, ChevronDown, Check, Sparkles, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { uploadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TagInput from './TagInput';
import { useBackClose } from '../hooks/useBackClose';

import { useNavigate } from 'react-router-dom';

const UploadModal = ({ isOpen, onClose, onUpload, type = 'image', initialData = null, customFields = [] }) => {
  const { t } = useTranslation();
  useBackClose(isOpen, onClose);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!initialData;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.url || initialData?.audio || initialData?.video || null);
  
  // Secondary file (Cover image for Music/Video/Event)
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(initialData?.cover || initialData?.thumbnail || initialData?.image || null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [tags, setTags] = useState(initialData?.tags || ''); // Tags state
  const [description, setDescription] = useState(initialData?.excerpt || initialData?.description || '');
  const [content, setContent] = useState(initialData?.content || ''); // Full content
  const [artist, setArtist] = useState(initialData?.artist || '');
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [size, setSize] = useState(initialData?.size || '');
  const [dragTarget, setDragTarget] = useState(null);

  // Photo specific
  
  // Event specific
  const [eventDate, setEventDate] = useState(initialData?.date || '');
  const [eventEndDate, setEventEndDate] = useState(initialData?.end_date || '');
  const [eventLocation, setEventLocation] = useState(initialData?.location || '');
  const [eventLink, setEventLink] = useState(initialData?.link || '');
  
  // Phase 1 New Fields
  const [eventScore, setEventScore] = useState(initialData?.score || '');
  const [eventVolunteerTime, setEventVolunteerTime] = useState(initialData?.volunteer_time || '');
  const [eventTarget, setEventTarget] = useState(initialData?.target_audience || '');
  const [eventOrganizer, setEventOrganizer] = useState(initialData?.organizer || '');
  const [dateReasoning, setDateReasoning] = useState('');

  // WeChat Parsing
  const [wechatUrl, setWechatUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleParseWeChat = async () => {
    if (!wechatUrl) {
        toast.error('请输入微信公众号文章链接');
        return;
    }
    
    // Validate URL format
    const wechatUrlRegex = /^https?:\/\/(mp\.weixin\.qq\.com|www\.weixin\.qq\.com)/i;
    if (!wechatUrlRegex.test(wechatUrl)) {
        toast.error('请输入有效的微信公众号文章链接 (mp.weixin.qq.com)');
        return;
    }
    
    setIsParsing(true);
    try {
        const { data } = await api.post('/resources/parse-wechat', { url: wechatUrl });
        
        if (data) {
            if (data.title) setTitle(data.title);
            
            // date and end_date are now YYYY-MM-DDTHH:MM format from AI parsing
            if (data.date) setEventDate(data.date);
            if (data.end_date) setEventEndDate(data.end_date);
            if (data.location) setEventLocation(data.location);
            if (data.content) setContent(data.content); // Store full content for parsing/editing
            if (data.description) setDescription(data.description); // Summary for description
            
            // New fields mapping
            if (data.organizer) setEventOrganizer(data.organizer);
            if (data.target_audience) setEventTarget(data.target_audience);
            if (data.volunteer_time) setEventVolunteerTime(data.volunteer_time);
            if (data.score) setEventScore(data.score);
            if (data.date_reasoning) setDateReasoning(data.date_reasoning);

            // Auto-generate tags if available
            if (data.tags && data.tags.length > 0) {
                // Merge with existing tags
                const currentTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                const newTags = [...new Set([...currentTags, ...data.tags])];
                setTags(newTags.join(','));
            }

            // Set cover image if available
            if (data.coverImage) {
                setCoverPreview(data.coverImage);
            }

            // Auto-fill event link with source WeChat URL if not already set
            if (!eventLink) setEventLink(wechatUrl);

            toast.success(t('upload.parse_success'));
        }
    } catch (error) {
        console.error('WeChat Parse Error:', error);
        const errorMessage = error.response?.data?.message || error.response?.data?.error || t('upload.parse_failed');
        toast.error(errorMessage);
    } finally {
        setIsParsing(false);
    }
  };

  const handleClearParsedData = () => {
      setWechatUrl('');
      setTitle('');
      setDescription('');
      setContent('');
      setEventDate('');
      setEventEndDate('');
      setEventLocation('');
      setEventOrganizer('');
      setEventTarget('');
      setEventVolunteerTime('');
      setEventScore('');
      setDateReasoning('');
      setEventLink('');
      setTags('');
      toast.success(t('upload.cleared'));
  };

  // Reset form when modal opens with new data or closes
  React.useEffect(() => {
    if (isOpen) {
        if (!user) {
            toast.error(t('auth.signin_desc'));
            onClose();
            return;
        }

        if (initialData) {
            setTitle(initialData.title || '');
            setTags(initialData.tags || '');
            setDescription(initialData.excerpt || initialData.description || '');
            setContent(initialData.content || '');
            setArtist(initialData.artist || '');
            setEventDate(initialData.date || '');
            setEventEndDate(initialData.end_date || '');
            setEventLocation(initialData.location || '');
            setEventLink(initialData.link || '');
            setEventScore(initialData.score || '');
            setEventVolunteerTime(initialData.volunteer_time || '');
            setEventTarget(initialData.target_audience || '');
            setEventOrganizer(initialData.organizer || '');
            setFeatured(initialData.featured || false);
            setSize(initialData.size || '');
            setPreview(initialData.url || initialData.audio || initialData.video || null);
            setCoverPreview(initialData.cover || initialData.thumbnail || initialData.image || null);
        } else {
            setTitle('');
            setTags('');
            setDescription('');
            setContent('');
            setArtist('');
            setEventDate('');
            setEventEndDate('');
            setEventLocation('');
            setEventLink('');
            setEventScore('');
            setEventTarget('');
            setEventOrganizer('');
            setFeatured(false);
            setSize('');
            setPreview(null);
            setCoverPreview(null);
        }
        setFile(null);
        setCoverFile(null);
        setWechatUrl('');
        setIsParsing(false);
    }
  }, [isOpen, initialData, user, t, onClose]);

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
    if (!isEditing && type !== 'event' && type !== 'article' && !file) {
        toast.error(t('upload.file_required'));
        return;
    }

    if (type === 'event' && !eventEndDate) {
        toast.error(t('upload.required_end_date'));
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
        tags, // Include tags
        tag: tags, // For backward compatibility with article 'tag'
        url: fileUrl, 
        
        // Music specific
        audio: type === 'audio' ? fileUrl : null,
        artist: type === 'audio' ? (artist || t('common.unknown_artist')) : null,
        
        // Video specific
        video: type === 'video' ? fileUrl : null,
        
        // Event specific
        image: type === 'event' ? (coverUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1000&auto=format&fit=crop') : null,
        date: (type === 'event' || type === 'article') ? eventDate : new Date().toLocaleDateString(),
        end_date: type === 'event' ? eventEndDate : null,
        time: null,
        location: type === 'event' ? eventLocation : null,
        link: type === 'event' ? eventLink : null,
        score: type === 'event' ? eventScore : null,
        target_audience: type === 'event' ? eventTarget : null,
        organizer: type === 'event' ? eventOrganizer : null,
        status: initialData?.status || 'pending', // Default to pending review
        volunteer_time: type === 'event' ? eventVolunteerTime : null,

        // Cover/Thumbnail logic
        cover: coverUrl || (type === 'image' || type === 'article' ? fileUrl : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
        thumbnail: coverUrl || (type === 'image' || type === 'article' ? fileUrl : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',

        excerpt: description,
        content: content || `<p>${description}</p>`, // Use content if available, else fallback
        description: description, // for events/photos consistency
        featured: featured ? 1 : 0,
        size: type === 'image' ? size : null,
        
        // Defaults if new
        ...(!isEditing ? {
            duration: 0,
        } : {
            // If editing, update these too if type matches
        })
      };

      await onUpload(newItem);
      
      const successMessage = isEditing 
        ? t('upload.update_success')
        : (isAdmin ? t('upload.upload_success') : t('upload.upload_pending_review'));
      
      toast.success(successMessage);
      onClose();

    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(t('upload.upload_failed'));
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

  const handleDragEnter = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(target);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(target);
  };

  const handleDrop = (e, isCover = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
        const accept = getAcceptType(isCover);
        const typeRegex = new RegExp(accept.replace('*', '.*'));
        if (!droppedFile.type.match(typeRegex)) {
             toast.error(t('upload.invalid_file_type', { type: accept }));
             return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (isCover) {
                setCoverFile(droppedFile);
                setCoverPreview(reader.result);
            } else {
                setFile(droppedFile);
                setPreview(reader.result);
            }
        };
        reader.readAsDataURL(droppedFile);
    }
  };

  // UI Constants
  const inputClasses = "w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 sm:py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all duration-300 text-base min-h-[48px] sm:min-h-[44px]";
  const labelClasses = "block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider pl-1";
  const cardClasses = "bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-xl";
  const uploadBoxClasses = (isActive) => `relative border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center group transition-all duration-300 bg-black/20 ${isActive ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-[#0f0f0f] border-0 sm:border border-white/10 rounded-none sm:rounded-[2rem] w-full h-[100dvh] sm:h-auto ${type === 'event' ? 'sm:max-w-5xl' : 'sm:max-w-2xl'} overflow-hidden shadow-2xl sm:max-h-[90vh] flex flex-col z-10`}
            onClick={e => e.stopPropagation()}
          >
             {/* Gradient Ambience */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent opacity-50 pointer-events-none" />

            {/* Header - Fixed at top */}
            <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-white/5 flex justify-between items-center bg-[#0f0f0f]/95 backdrop-blur-xl z-20 flex-shrink-0 pt-[max(env(safe-area-inset-top),16px)] sm:pt-6">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <span className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                    {React.cloneElement(getIcon(), { size: 24 })}
                </span>
                <span className="truncate">
                    {isEditing ? t('admin.edit_item') : t('common.upload')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{t(`common.${type}`)}</span>
                </span>
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all border border-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
              <div className="p-5 sm:p-8 flex-1 space-y-6 sm:space-y-8">
              {type === 'event' ? (
                <>
                {/* Event Specific Fields */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-3xl relative overflow-hidden group shadow-lg">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
                        <Link size={100} className="text-green-500 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Sparkles size={18} />
                            {t('upload.smart_parse_title', '智能识别')}
                        </h4>
                        <p className="text-sm text-green-100/60 mb-5 max-w-xl leading-relaxed">
                            {t('upload.smart_parse_desc', '粘贴微信公众号文章链接，一键自动提取活动详情。')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500/50" />
                                <input
                                    type="text"
                                    value={wechatUrl}
                                    onChange={(e) => setWechatUrl(e.target.value)}
                                    placeholder="https://mp.weixin.qq.com/s/..."
                                    className="w-full bg-black/40 border border-green-500/30 rounded-2xl pl-11 pr-4 py-3.5 sm:py-3 text-white placeholder:text-green-500/30 focus:outline-none focus:border-green-500 focus:bg-black/60 transition-all text-sm shadow-inner"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleParseWeChat}
                                disabled={!wechatUrl || isParsing}
                                className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 whitespace-nowrap"
                            >
                                {isParsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        {t('upload.smart_parse')}
                                    </>
                                )}
                            </button>
                            
                            {(wechatUrl || title) && (
                                <button 
                                    type="button"
                                    onClick={handleClearParsedData}
                                    className="w-full sm:w-auto px-6 py-3.5 sm:px-4 sm:py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-2"
                                    title={t('common.clear')}
                                >
                                    <RotateCcw size={18} />
                                    <span className="sm:hidden font-medium">{t('common.clear')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Left Column: Media & Core Info */}
                  <div className="space-y-6 sm:space-y-8">
                     {/* Cover Image (Event Image) */}
                     <div className="space-y-3">
                        <label className={labelClasses}>{t('common.image')}</label>
                        <div 
                            className={`${uploadBoxClasses(dragTarget === 'cover')} h-48 sm:h-64`}
                            onDragEnter={(e) => handleDragEnter(e, 'cover')}
                            onDragLeave={handleDragLeave}
                            onDragOver={(e) => handleDragOver(e, 'cover')}
                            onDrop={(e) => handleDrop(e, true)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {coverPreview ? (
                                <div className="relative h-full w-full flex justify-center items-center pointer-events-none">
                                    <img src={coverPreview} alt="Cover Preview" className="h-full rounded-2xl object-contain shadow-lg" />
                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm ${dragTarget === 'cover' ? 'opacity-100' : ''}`}>
                                        <p className="text-sm font-medium text-white flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20"><Upload size={16} /> {t('upload.replace')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none text-center">
                                    <div className={`p-4 rounded-full mb-4 transition-transform duration-300 ${dragTarget === 'cover' ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white group-hover:scale-110'}`}>
                                        <Plus size={28} />
                                    </div>
                                    <span className={`text-base font-bold transition-colors ${dragTarget === 'cover' ? 'text-indigo-300' : 'text-gray-400 group-hover:text-white'}`}>
                                        {dragTarget === 'cover' ? t('upload.drop_image') : `${t('common.upload')} ${t('common.image')}`}
                                    </span>
                                </div>
                            )}
                        </div>
                     </div>

                     {/* Title & Description */}
                     <div className={cardClasses}>
                        <div>
                            <label className={labelClasses}>{t('common.title')}</label>
                            <input
                              type="text"
                              required
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              className={`${inputClasses} text-lg font-bold`}
                              placeholder={t('upload.title_placeholder')}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>{t('admin.fields.description')}</label>
                            <textarea
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              className={`${inputClasses} h-36 resize-none leading-relaxed py-4`}
                              placeholder={t('upload.description_placeholder')}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>{t('upload.tags')}</label>
                            <TagInput 
                              value={tags}
                              onChange={setTags}
                              placeholder={t('upload.tags_placeholder')}
                              type="events"
                            />
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Event Details */}
                  <div className="space-y-6 sm:space-y-8">
                      {/* Basic Info Card */}
                      <div className={cardClasses}>
                           <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b border-white/10">
                               <Calendar size={16} className="text-indigo-400" /> {t('event_fields.basic_info')}
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-2">
                               <div className="col-span-1">
                                    <label className={labelClasses}>{t('event_fields.start_date')}</label>
                                    <input
                                        type="datetime-local"
                                        step="1800"
                                        required
                                        value={eventDate ? (eventDate.length === 10 ? eventDate + 'T00:00' : eventDate.substring(0, 16)) : ''}
                                        onChange={e => setEventDate(e.target.value)}
                                        className={inputClasses}
                                    />
                               </div>
                               <div className="col-span-1">
                                    <label className={labelClasses}>{t('event_fields.end_date')}</label>
                                    <input
                                        type="datetime-local"
                                        step="1800"
                                        required
                                        value={eventEndDate ? (eventEndDate.length === 10 ? eventEndDate + 'T00:00' : eventEndDate.substring(0, 16)) : ''}
                                        onChange={e => setEventEndDate(e.target.value)}
                                        className={inputClasses}
                                    />
                               </div>
                               
                               {/* Date Reasoning Display */}
                               {dateReasoning && (
                                   <div className="col-span-1 sm:col-span-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                                       <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <Sparkles size={40} className="text-indigo-400" />
                                       </div>
                                       <div className="flex items-start gap-3 sm:gap-4 relative z-10">
                                           <div className="p-2 bg-indigo-500/20 rounded-lg mt-0.5">
                                                <Sparkles size={16} className="text-indigo-400" />
                                           </div>
                                           <div>
                                               <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
                                                   {t('upload.ai_reasoning') || 'AI Reasoning'}
                                               </h5>
                                               <p className="text-sm text-indigo-100/80 leading-relaxed font-medium">
                                                   {dateReasoning}
                                               </p>
                                           </div>
                                       </div>
                                   </div>
                               )}

                               <div className="col-span-1 md:col-span-2">
                                    <label className={labelClasses}>{t('common.location')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={eventLocation}
                                        onChange={e => setEventLocation(e.target.value)}
                                        className={inputClasses}
                                        placeholder={t('upload.location_placeholder')}
                                    />
                               </div>
                           </div>
                      </div>

                      {/* Attributes Card */}
                      <div className={cardClasses}>
                           <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b border-white/10">
                               <Tag size={16} className="text-indigo-400" /> {t('event_fields.attributes')}
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-2">
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.volunteer_duration')}</label>
                                   <input
                                       type="text"
                                       value={eventVolunteerTime}
                                       onChange={e => setEventVolunteerTime(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.volunteer_time_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.organizer')}</label>
                                   <input
                                       type="text"
                                       value={eventOrganizer}
                                       onChange={e => setEventOrganizer(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.organizer_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.score_label')}</label>
                                   <input
                                       type="text"
                                       value={eventScore}
                                       onChange={e => setEventScore(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.score_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.target_audience')}</label>
                                   <input
                                       type="text"
                                       value={eventTarget}
                                       onChange={e => setEventTarget(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.target_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1 sm:col-span-2">
                                   <label className={labelClasses}>{t('upload.event_link')}</label>
                                   <div className="relative group">
                                       <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                       <input
                                           type="text"
                                           value={eventLink}
                                           onChange={e => setEventLink(e.target.value)}
                                           className={`${inputClasses} pl-11`}
                                           placeholder="https://..."
                                       />
                                   </div>
                               </div>
                           </div>
                      </div>
                  </div>
                </div>
                </>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Main File Upload */}
                  {type !== 'event' && (
                  <div className="space-y-2">
                    <label className={labelClasses}>
                        {t(`common.${type}`)}
                    </label>
                     <div 
                        className={`${uploadBoxClasses(dragTarget === 'main')} min-h-[160px] sm:min-h-[200px]`}
                        onDragEnter={(e) => handleDragEnter(e, 'main')}
                        onDragLeave={handleDragLeave}
                        onDragOver={(e) => handleDragOver(e, 'main')}
                        onDrop={(e) => handleDrop(e, false)}
                    >
                        <input
                        type="file"
                        accept={getAcceptType()}
                        onChange={(e) => handleFileChange(e, false)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        
                        {preview ? (
                            type === 'audio' ? (
                                <div className="text-center relative z-20 pointer-events-none px-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                                        <Music size={24} className="text-green-400 sm:w-8 sm:h-8" />
                                    </div>
                                    <p className="text-white font-medium text-sm break-all">{file?.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{t('upload.click_drag_replace')}</p>
                                </div>
                            ) : type === 'video' ? (
                                <div className="relative z-20 pointer-events-none w-full flex justify-center px-4">
                                    <video src={preview} className="max-h-48 sm:max-h-64 rounded-xl shadow-lg" controls />
                                </div>
                            ) : (
                                <div className="relative z-20 pointer-events-none px-4">
                                    <img src={preview} alt="Preview" className="max-h-48 sm:max-h-64 rounded-xl object-contain shadow-2xl" />
                                </div>
                            )
                        ) : (
                        <div className="flex flex-col items-center justify-center text-center pointer-events-none px-4">
                            <div className={`p-3 sm:p-4 rounded-full mb-3 sm:mb-4 transition-transform duration-300 ${dragTarget === 'main' ? 'bg-indigo-500/20 scale-110 text-indigo-400' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:scale-110 group-hover:text-white'}`}>
                               {dragTarget === 'main' ? <Upload size={24} className="sm:w-8 sm:h-8" /> : React.cloneElement(getIcon(), { size: 24, className: 'sm:w-8 sm:h-8' })}
                            </div>
                            <p className="text-white font-medium text-base sm:text-lg">
                            {dragTarget === 'main' ? t('upload.drop_file') : `${t('common.upload')} ${t(`common.${type}`)}`}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 max-w-xs mx-auto">
                                {t('upload.drag_drop_browse')}
                            </p>
                        </div>
                        )}
                    </div>
                  </div>
                  )}

                  {/* Cover Image Upload (For Audio/Video) */}
                  {(type === 'audio' || type === 'video') && (
                     <div className="space-y-2">
                        <label className={labelClasses}>{t('common.cover')}</label>
                        <div 
                            className={`${uploadBoxClasses(dragTarget === 'cover')} h-32 sm:h-40`}
                            onDragEnter={(e) => handleDragEnter(e, 'cover')}
                            onDragLeave={handleDragLeave}
                            onDragOver={(e) => handleDragOver(e, 'cover')}
                            onDrop={(e) => handleDrop(e, true)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {coverPreview ? (
                                <div className="relative h-full w-full flex justify-center items-center pointer-events-none px-4">
                                    <img src={coverPreview} alt="Cover Preview" className="h-full rounded-lg object-contain" />
                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm ${dragTarget === 'cover' ? 'opacity-100' : ''}`}>
                                        <p className="text-xs text-white flex items-center gap-1"><Upload size={14}/> {t('upload.replace')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none">
                                    <Plus size={20} className={`mb-2 transition-colors sm:w-6 sm:h-6 ${dragTarget === 'cover' ? 'text-indigo-400' : 'text-gray-400'}`} />
                                    <span className={`text-xs font-medium transition-colors ${dragTarget === 'cover' ? 'text-indigo-300' : 'text-gray-500'}`}>
                                        {dragTarget === 'cover' ? t('upload.drop_image') : `${t('common.upload')} ${t('common.image')}`}
                                    </span>
                                </div>
                            )}
                        </div>
                     </div>
                  )}

                  {/* Inputs Card */}
                  <div className={cardClasses}>
                    <div>
                      <label className={labelClasses}>{t('common.title')}</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className={`${inputClasses} text-lg font-medium`}
                        placeholder={t('upload.title_placeholder')}
                      />
                    </div>

                    {/* Image Specific Fields: Size */}
                    {type === 'image' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className={labelClasses}>{t('common.size')}</label>
                                <input
                                    type="text"
                                    value={size}
                                    onChange={e => setSize(e.target.value)}
                                    className={inputClasses}
                                    placeholder={t('upload.size_placeholder')}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className={labelClasses}>{t('upload.tags')}</label>
                                <TagInput 
                                    value={tags}
                                    onChange={setTags}
                                    placeholder={t('upload.tags_placeholder')}
                                    type={type === 'image' ? 'photos' : type === 'audio' ? 'music' : type}
                                />
                            </div>
                         </div>
                    )}
                    
                    {type !== 'image' && (
                        <div>
                            <label className={labelClasses}>{t('upload.tags')}</label>
                            <TagInput 
                                value={tags}
                                onChange={setTags}
                                placeholder={t('upload.tags_placeholder')}
                                type={type === 'image' ? 'photos' : type === 'audio' ? 'music' : type}
                            />
                        </div>
                    )}


                    {/* Audio Specific Fields */}
                    {type === 'audio' && (
                        <div>
                            <label className={labelClasses}>{t('common.artist')}</label>
                            <input
                                type="text"
                                value={artist}
                                onChange={e => setArtist(e.target.value)}
                                className={inputClasses}
                                placeholder={t('upload.artist_placeholder')}
                            />
                        </div>
                    )}

                    {/* Article Specific Fields */}
                    {type === 'article' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="col-span-1">
                                <label className={labelClasses}>{t('common.date')}</label>
                                <input
                                    type="date"
                                    value={eventDate ? eventDate.split('T')[0] : ''}
                                    onChange={e => setEventDate(e.target.value)}
                                    className={inputClasses}
                                />
                            </div>
                             <div className="col-span-1 sm:col-span-2">
                                <label className={labelClasses}>{t('common.content')}</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className={`${inputClasses} h-32 sm:h-40 font-mono text-sm leading-relaxed`}
                                    placeholder="# Markdown content supported..."
                                />
                            </div>
                        </div>
                    )}

                    <div>
                      <label className={labelClasses}>{t('admin.fields.description')}</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={`${inputClasses} h-20 sm:h-24 resize-none`}
                        placeholder={t('upload.description_placeholder')}
                      />
                    </div>
                    
                    {/* Featured Checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                        <div 
                            className={`w-6 h-6 sm:w-5 sm:h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${featured ? 'bg-indigo-500 border-indigo-500' : 'bg-white/5 border-white/20 hover:border-white/40'}`}
                            onClick={() => setFeatured(!featured)}
                        >
                            {featured && <Check size={14} className="text-white sm:w-3 sm:h-3" />}
                        </div>
                        <label 
                            className="text-sm font-medium text-gray-300 select-none cursor-pointer hover:text-white transition-colors"
                            onClick={() => setFeatured(!featured)}
                        >
                            {t('common.featured')}
                        </label>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Submit Buttons - Sticky at bottom */}
              <div className="sticky bottom-0 bg-[#0f0f0f]/95 backdrop-blur-2xl border-t border-white/5 p-5 sm:p-8 mt-auto z-20 pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-8 flex flex-col-reverse sm:flex-row justify-end gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-4 sm:py-3.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold text-sm border border-white/5 sm:border-none bg-white/5 sm:bg-transparent"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full sm:w-auto px-8 py-4 sm:py-3.5 bg-white text-black rounded-2xl hover:bg-gray-100 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 font-black text-sm shadow-xl shadow-white/10"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                      <span>{t('upload.uploading')}...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span>{isEditing ? t('common.save') : t('common.upload_now')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UploadModal;