import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Music, Film, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const categories = [
  {
    id: 'events',
    path: '/events',
    icon: Calendar,
    image: '/uploads/cat_events.jpg',
    color: 'from-red-500/80 to-orange-600/80',
    delay: 0.1
  },
  {
    id: 'gallery',
    path: '/gallery',
    icon: Camera,
    image: '/uploads/cat_gallery.jpg',
    color: 'from-purple-500/80 to-indigo-600/80',
    delay: 0.2
  },
  {
    id: 'music',
    path: '/music',
    icon: Music,
    image: '/uploads/cat_music.jpg',
    color: 'from-cyan-500/80 to-blue-600/80',
    delay: 0.3
  },
  {
    id: 'videos',
    path: '/videos',
    icon: Film,
    image: '/uploads/cat_videos.jpg',
    color: 'from-pink-500/80 to-rose-600/80',
    delay: 0.4
  },
  {
    id: 'articles',
    path: '/articles',
    icon: BookOpen,
    image: '/uploads/cat_articles.jpg',
    color: 'from-emerald-500/80 to-teal-600/80',
    delay: 0.5
  }
];

const CategoryCard = ({ item }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: item.delay }}
      className="relative group h-[400px] w-full overflow-hidden rounded-3xl cursor-pointer"
    >
      <Link to={item.path} className="block w-full h-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={item.image} 
            alt={t(`nav.${item.id}`)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />
        
        {/* Dark Gradient for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

        {/* Content */}
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            {/* Icon */}
            <div className="mb-4 inline-block p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg group-hover:bg-white/20 transition-colors">
              <item.icon size={32} strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h3 className="text-3xl font-bold font-serif text-white mb-2 tracking-tight">
              {t(`nav.${item.id}`)}
            </h3>

            {/* Description (Static for now, could be dynamic or translated) */}
            <p className="text-gray-300 mb-6 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform translate-y-2 group-hover:translate-y-0">
              {t(`home.categories.${item.id}_desc`)}
            </p>

            {/* Action Button */}
            <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-sm">
              <span>{t('common.explore')}</span>
              <ArrowRight size={16} className="transform group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>
        </div>

        {/* Decorative Border */}
        <div className="absolute inset-0 border border-white/10 rounded-3xl group-hover:border-white/30 transition-colors duration-500 pointer-events-none" />
      </Link>
    </motion.div>
  );
};

const HomeCategories = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-black relative z-10">
      <div className="max-w-[1800px] mx-auto">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-serif text-white mb-4">
            Discover
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto" />
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} item={category} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCategories;
