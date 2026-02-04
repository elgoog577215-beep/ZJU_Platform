import React, { useState, useEffect } from 'react';
import { MapPin, Building2, Tag, Users, Filter, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import Dropdown from './Dropdown';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedFilter = ({ filters, onChange, className = "", variant = 'card', refreshTrigger = 0 }) => {
    const { t } = useTranslation();
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
            try {
                // Prepare params from current filters
                const params = {};
                Object.keys(filters).forEach(key => {
                    if (filters[key] && filters[key] !== 'all') {
                        params[key] = filters[key];
                    }
                });

                const [locations, organizers, audiences] = await Promise.all([
                    api.get('/events/distinct/location', { params }),
                    api.get('/events/distinct/organizer', { params }),
                    api.get('/events/distinct/target_audience', { params })
                ]);

                setOptions({
                    location: locations.data.map(item => ({ value: item, label: item })),
                    organizer: organizers.data.map(item => ({ value: item, label: item })),
                    target_audience: audiences.data.map(item => ({ value: item, label: item }))
                });
            } catch (error) {
                console.error("Failed to fetch filter options", error);
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
        onChange({
            location: null,
            organizer: null,
            target_audience: null
        });
    };

    const hasActiveFilters = Object.values(filters).some(v => v);

    const filterConfig = [
        { key: 'organizer', icon: Building2, labelKey: 'advanced_filter.organizer', allLabelKey: 'advanced_filter.all_organizers', options: options.organizer },
        { key: 'location', icon: MapPin, labelKey: 'advanced_filter.location', allLabelKey: 'advanced_filter.all_locations', options: options.location },
        { key: 'target_audience', icon: Users, labelKey: 'advanced_filter.target_audience', allLabelKey: 'advanced_filter.all_target_audiences', options: options.target_audience },
    ];

    const containerClasses = variant === 'card' 
        ? "bg-[#0a0a0a]/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-3 md:p-6 shadow-xl"
        : "";

    if (loading) return <div className="animate-pulse h-24 bg-white/5 rounded-2xl w-full mb-4"></div>;

    return (
        <div className={`w-full relative z-20 ${className}`}>
            <div className={containerClasses}>
                <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div 
                        className="flex items-center gap-2 cursor-pointer md:cursor-default"
                        onClick={() => {
                            if (isMobile) {
                                setOverflowVisible(false);
                                setIsCollapsed(!isCollapsed);
                            }
                        }}
                    >
                        <div className={`p-1.5 md:p-2 rounded-lg ${variant === 'card' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white'}`}>
                            <SlidersHorizontal size={isMobile ? 16 : 18} />
                        </div>
                        <span className="font-bold text-white text-base md:text-lg tracking-wide">{t('advanced_filter.title', 'Filter Properties')}</span>
                        {isMobile && (
                            <motion.div 
                                animate={{ rotate: isCollapsed ? 0 : 180 }}
                                className="ml-1 text-gray-400"
                            >
                                <ChevronDown size={16} />
                            </motion.div>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFilters();
                            }}
                            className="text-xs font-medium text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10"
                        >
                            <X size={12} />
                            {t('common.clear_all', 'Clear All')}
                        </button>
                    )}
                </div>
                
                <AnimatePresence>
                    {(!isMobile || !isCollapsed) && (
                        <motion.div
                            initial={isMobile ? { height: 0, opacity: 0 } : false}
                            animate={isMobile ? { height: 'auto', opacity: 1 } : false}
                            exit={isMobile ? { height: 0, opacity: 0 } : false}
                            onAnimationComplete={() => {
                                if (!isCollapsed) setOverflowVisible(true);
                            }}
                            className={isMobile && !overflowVisible ? "overflow-hidden" : ""}
                        >
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-1">
                                {filterConfig.map(({ key, icon, labelKey, allLabelKey, options: fieldOptions }) => (
                                    <Dropdown
                                        key={key}
                                        value={filters[key] || 'all'}
                                        onChange={(val) => handleFilterChange(key, val)}
                                        options={[{ value: 'all', label: t(allLabelKey) }, ...fieldOptions]}
                                        icon={icon}
                                        placeholder={t(labelKey)}
                                        buttonClassName="bg-white/5 border border-white/10 hover:bg-white/10 w-full py-2.5 rounded-xl text-white text-sm backdrop-blur-sm transition-all shadow-lg"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdvancedFilter;
