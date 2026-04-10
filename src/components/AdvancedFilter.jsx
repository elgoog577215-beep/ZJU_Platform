import React, { useState, useEffect } from 'react';
import { MapPin, Building2, Users, Filter, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import Dropdown from './Dropdown';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

const AdvancedFilter = ({
    filters,
    onChange,
    className = "",
    variant = 'card',
    refreshTrigger = 0,
    lifecycle = 'all',
    onLifecycleChange,
}) => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === 'day';
    const [options, setOptions] = useState({
        location: [],
        organizer: [],
        target_audience: []
    });

    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [overflowVisible, setOverflowVisible] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) setIsCollapsed(true);
            else setIsCollapsed(false);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                // Prepare params from current filters
                const params = {};
                Object.keys(filters).forEach(key => {
                    if (filters[key] && filters[key] !== 'all') {
                        params[key] = filters[key];
                    }
                });

                const [locations, organizers, audiences] = await Promise.allSettled([
                    api.get('/events/distinct/location', { params, silent: true }),
                    api.get('/events/distinct/organizer', { params, silent: true }),
                    api.get('/events/distinct/target_audience', { params, silent: true })
                ]);

                setOptions({
                    location: locations.status === 'fulfilled' ? locations.value.data.map(item => ({ value: item, label: item })) : [],
                    organizer: organizers.status === 'fulfilled' ? organizers.value.data.map(item => ({ value: item, label: item })) : [],
                    target_audience: audiences.status === 'fulfilled' ? audiences.value.data.map(item => ({ value: item, label: item })) : []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchOptions();
    }, [filters, refreshTrigger]);

    const handleFilterChange = (key, value) => {
        onChange({ ...filters, [key]: value === 'all' ? null : value });
    };

    const clearFilters = () => {
        onChange({ location: null, organizer: null, target_audience: null });
        if (onLifecycleChange) onLifecycleChange('all');
    };

    const lifecycleOptions = [
        { value: 'all', label: t('common.all') },
        { value: 'upcoming', label: t('events.status.upcoming') },
        { value: 'ongoing', label: t('events.status.ongoing') },
        { value: 'past', label: t('events.status.past') },
    ];

    const hasActiveFilters = Object.values(filters).some(v => v) || lifecycle !== 'all';
    const activeAttributeCount = Object.values(filters).filter(Boolean).length;
    const activeFilterCount = activeAttributeCount + (lifecycle !== 'all' ? 1 : 0);

    const attributeFilterConfig = [
        { key: 'organizer', icon: Building2, labelKey: 'advanced_filter.organizer', allLabelKey: 'advanced_filter.all_organizers', options: options.organizer },
        { key: 'location', icon: MapPin, labelKey: 'advanced_filter.location', allLabelKey: 'advanced_filter.all_locations', options: options.location },
        { key: 'target_audience', icon: Users, labelKey: 'advanced_filter.target_audience', allLabelKey: 'advanced_filter.all_target_audiences', options: options.target_audience },
    ];

    const isSheetVariant = variant === 'sheet';
    const dropdownButtonClassName = isSheetVariant
        ? 'w-full py-3.5 rounded-2xl text-sm transition-all shadow-sm'
        : 'w-full py-2.5 rounded-xl text-sm transition-all';
    const containerClasses = variant === 'card'
        ? `${isDayMode ? 'bg-white/82 border border-slate-200/80 shadow-[0_18px_44px_rgba(148,163,184,0.14)]' : 'bg-black/20 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'} rounded-3xl p-4 md:p-6`
        : "";

    if (loading) return <div className={`animate-pulse h-24 rounded-2xl w-full mb-4 ${isDayMode ? 'bg-white/75 border border-slate-200/80' : 'bg-white/5'}`}></div>;

    return (
        <div className={`w-full relative z-20 ${className}`}>
            {/* Backdrop blur as a separate non-clipping layer */}
            {variant === 'card' && (
                <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl pointer-events-none" />
            )}
            <div className={`relative ${containerClasses}`}>
                {!isSheetVariant && (
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                      <div 
                          className="flex items-center gap-3 cursor-pointer md:cursor-default"
                          onClick={() => {
                              if (isMobile) {
                                  setOverflowVisible(false);
                                  setIsCollapsed(!isCollapsed);
                              }
                          }}
                      >
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]">
                              <SlidersHorizontal size={20} />
                          </div>
                          <h3 className={`text-lg font-bold tracking-wide ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                              {t('advanced_filter.title')}
                          </h3>
                          {activeFilterCount > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${isDayMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200/80' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'}`}>
                                  {t('common.selected_count', '已选 {{count}} 项', { count: activeFilterCount })}
                              </span>
                          )}
                          {isMobile && (
                              <motion.div
                                  animate={{ rotate: isCollapsed ? 0 : 180 }}
                                  transition={{ duration: 0.2 }}
                                  className={`ml-2 ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}
                              >
                                  <ChevronDown size={16} />
                              </motion.div>
                          )}
                      </div>
                      
                      {hasActiveFilters && (
                          <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              type="button"
                              onClick={clearFilters}
                              className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${isDayMode ? 'bg-red-50 text-red-500 hover:bg-red-100 border-red-200/80' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border-red-500/10'}`}
                          >
                              <X size={12} />
                              {t('advanced_filter.clear')}
                          </motion.button>
                      )}
                  </div>
                )}
                
                <AnimatePresence>
                    {((!isMobile || !isCollapsed) || isSheetVariant) && (
                        <motion.div
                            initial={isMobile && !isSheetVariant ? { height: 0, opacity: 0 } : false}
                            animate={isMobile && !isSheetVariant ? { height: 'auto', opacity: 1 } : false}
                            exit={isMobile && !isSheetVariant ? { height: 0, opacity: 0 } : false}
                            onAnimationComplete={() => {
                                if (!isCollapsed) setOverflowVisible(true);
                            }}
                            className={isMobile && !overflowVisible && !isSheetVariant ? "overflow-hidden" : ""}
                        >
                            <div className={`grid ${isSheetVariant ? 'grid-cols-1 gap-3' : 'grid-cols-2 xl:grid-cols-4 gap-3'} pb-1`}>
                                {attributeFilterConfig.map(({ key, icon, labelKey, allLabelKey, options: fieldOptions }) => (
                                    <Dropdown
                                        key={key}
                                        value={filters[key] || 'all'}
                                        onChange={(val) => handleFilterChange(key, val)}
                                        options={[{ value: 'all', label: t(allLabelKey) }, ...fieldOptions]}
                                        icon={icon}
                                        placeholder={t(labelKey)}
                                        variant={variant}
                                        buttonClassName={dropdownButtonClassName}
                                    />
                                ))}
                                {/* Lifecycle filter lives here alongside attribute filters */}
                                {onLifecycleChange && (
                                    <Dropdown
                                        value={lifecycle}
                                        onChange={onLifecycleChange}
                                        options={lifecycleOptions}
                                        icon={Filter}
                                        variant={variant}
                                        buttonClassName={dropdownButtonClassName}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdvancedFilter;
